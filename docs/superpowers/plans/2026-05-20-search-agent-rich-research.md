# Search Agent Rich Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the search agent the ability to scrape full article content via a new `fetch-page` tool, producing structured research notes (`brief`, `keyFacts`, `fullText`) instead of thin RSS snippets.

**Architecture:** Add a `fetch-page` tool using @mozilla/readability + jsdom. Update search agent instructions to orchestrate search → scrape → structured output. Update the Topic model, JSON parser, and both API routes to carry the richer data through the pipeline.

**Tech Stack:** Mastra (@mastra/core), TypeScript, Zod, @mozilla/readability, jsdom, Prisma (SQLite/libsql), Next.js API routes, Vitest

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add @mozilla/readability, jsdom, and @types/jsdom**

```bash
pnpm add @mozilla/readability jsdom
pnpm add -D @types/jsdom
```

- [ ] **Step 2: Verify install**

```bash
pnpm ls @mozilla/readability jsdom @types/jsdom
```

Expected: all three packages appear in the dependency tree.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add readability, jsdom for article extraction"
```

---

### Task 2: Create `fetch-page` Tool

**Files:**
- Create: `mastra/tools/fetch-page-tool.ts`
- Create: `lib/fetch-page-tool.test.ts`

- [ ] **Step 1: Write the test**

Create `lib/fetch-page-tool.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { fetchPageTool } from "../mastra/tools/fetch-page-tool";

const SAMPLE_HTML = `<!DOCTYPE html><html><head><title>Test Article</title></head><body><article><h1>Test Article</h1><p>This is the first paragraph of a test article. It contains enough content to be meaningful for extraction purposes. We need multiple paragraphs to make the excerpt work properly.</p><p>This is the second paragraph with additional content about the topic at hand.</p></article></body></html>`;

const RAW_HTML = `<!DOCTYPE html><html><head><title>No Article Tag</title></head><body><h1>No Article Tag</h1><p>Content without semantic markup. Still useful for fallback extraction. Enough text here to produce a proper excerpt for testing purposes.</p><p>More fallback content that should be captured.</p></body></html>`;

describe("fetchPageTool", () => {
  it("extracts article content using Readability", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(SAMPLE_HTML, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      ),
    );

    const result = await fetchPageTool.execute!(
      { url: "https://example.com/article" },
      { abortSignal: new AbortController().signal } as any,
    );

    expect(result.title).toBe("Test Article");
    expect(result.url).toBe("https://example.com/article");
    expect(result.text).toContain("first paragraph");
    expect(result.text).toContain("second paragraph");
    expect(result.excerpt.length).toBeLessThanOrEqual(200);
    expect(result.excerpt).toBe(result.text.slice(0, 200));
    expect(result.length).toBe(result.text.length);
  });

  it("falls back to raw text when Readability fails", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(RAW_HTML, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      ),
    );

    const result = await fetchPageTool.execute!(
      { url: "https://example.com/raw" },
      { abortSignal: new AbortController().signal } as any,
    );

    expect(result.title).toBe("No Article Tag");
    expect(result.text).toBeTruthy();
    expect(result.text).not.toContain("<h1>");
    expect(result.text).not.toContain("<p>");
  });

  it("returns error object when fetch fails", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("Network error")));

    await expect(
      fetchPageTool.execute!(
        { url: "https://example.com/broken" },
        { abortSignal: new AbortController().signal } as any,
      ),
    ).rejects.toThrow();
  });

  it("rejects non-HTML content types", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      fetchPageTool.execute!(
        { url: "https://example.com/api" },
        { abortSignal: new AbortController().signal } as any,
      ),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run lib/fetch-page-tool.test.ts
```

Expected: FAIL — `fetchPageTool` is not defined yet.

- [ ] **Step 3: Create the tool implementation**

Create `mastra/tools/fetch-page-tool.ts`:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

function stripAllTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractContent(
  url: string,
  html: string,
): Promise<{ title: string; text: string; siteName?: string }> {
  const doc = new JSDOM(html, { url });
  const reader = new Readability(doc.window.document);
  const article = reader.parse();

  if (article?.textContent?.trim()) {
    return {
      title: article.title || doc.window.document.title || url,
      text: article.textContent.replace(/\s+/g, " ").trim(),
      siteName: article.siteName || undefined,
    };
  }

  const fallbackTitle = doc.window.document.title || url;
  const fallbackText = stripAllTags(html);
  return { title: fallbackTitle, text: fallbackText };
}

export const fetchPageTool = createTool({
  id: "fetch-page",
  description:
    "Fetch a web page and extract its main article content using Mozilla Readability. " +
    "Call this for each promising article URL found via web-search-news. " +
    "Returns cleaned article text, title, and a short excerpt.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL of the article to fetch"),
  }),
  outputSchema: z.object({
    title: z.string(),
    url: z.string(),
    text: z.string(),
    excerpt: z.string(),
    siteName: z.string().optional(),
    length: z.number(),
  }),
  execute: async ({ url }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; NewsletterAI/1.0; +https://example.invalid)",
          Accept: "text/html, */*",
        },
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        throw new Error(
          `Expected HTML content type but got: ${contentType}`,
        );
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch page: ${response.status} ${response.statusText}`,
        );
      }

      const html = await response.text();
      const { title, text, siteName } = await extractContent(url, html);
      const excerpt = text.slice(0, 200);

      return {
        title,
        url,
        text,
        excerpt,
        siteName,
        length: text.length,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run lib/fetch-page-tool.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run the full test suite**

```bash
pnpm test
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add mastra/tools/fetch-page-tool.ts lib/fetch-page-tool.test.ts
git commit -m "feat: add fetch-page tool for article content extraction"
```

---

### Task 3: Update Topic Model and JSON Parser

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `mastra/lib/topics-json.ts`
- Create: `lib/topics-json.test.ts`

- [ ] **Step 1: Update the Prisma schema**

In `prisma/schema.prisma`, change the `Topic` model:

```prisma
model Topic {
  id         String   @id @default(uuid())
  title      String
  sourceUrl  String
  brief      String                        // NEW: replaces "summary"
  keyFacts   String                        // NEW: JSON-serialized array of strings
  fullText   String                        // NEW: cleaned article text (~1500 words)
  isApproved Boolean  @default(true)
  issueId    String
  issue      Issue    @relation(fields: [issueId], references: [id], onDelete: Cascade)
}
```

Remove the old `summary` field.

- [ ] **Step 2: Update the Zod schema and type in topics-json.ts**

In `mastra/lib/topics-json.ts`, replace:

```typescript
export const newsletterTopicSchema = z.array(
  z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    sourceUrl: z.string().url(),
  }),
);
```

With:

```typescript
export const newsletterTopicSchema = z.array(
  z.object({
    title: z.string().min(1),
    sourceUrl: z.string().url(),
    brief: z.string().min(1),
    keyFacts: z.array(z.string().min(1)).min(1),
    fullText: z.string().min(1),
  }),
);
```

The `parseTopicsJson` function stays the same — it already handles extraction, JSON parsing, and schema validation generically.

- [ ] **Step 3: Write tests for the updated parser**

Create `lib/topics-json.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { parseTopicsJson } from "../mastra/lib/topics-json";

describe("parseTopicsJson", () => {
  it("parses valid JSON with new fields", () => {
    const result = parseTopicsJson(JSON.stringify([
      {
        title: "AI Breakthrough",
        sourceUrl: "https://example.com/ai",
        brief: "A major AI breakthrough happened today.",
        keyFacts: ["Fact one", "Fact two", "Fact three"],
        fullText: "Full article text goes here with substantial content.",
      },
    ]));

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      title: "AI Breakthrough",
      sourceUrl: "https://example.com/ai",
      brief: "A major AI breakthrough happened today.",
      keyFacts: ["Fact one", "Fact two", "Fact three"],
      fullText: "Full article text goes here with substantial content.",
    });
  });

  it("rejects missing required fields", () => {
    const oldFormat = JSON.stringify([
      {
        title: "Old Format",
        summary: "Has summary but no brief",
        sourceUrl: "https://example.com/old",
      },
    ]);

    expect(() => parseTopicsJson(oldFormat)).toThrow();
  });

  it("rejects empty keyFacts array", () => {
    const noFacts = JSON.stringify([
      {
        title: "No Facts",
        sourceUrl: "https://example.com/none",
        brief: "Has brief but no facts.",
        keyFacts: [],
        fullText: "Some text.",
      },
    ]);

    expect(() => parseTopicsJson(noFacts)).toThrow();
  });

  it("rejects empty brief", () => {
    const emptyBrief = JSON.stringify([
      {
        title: "Empty Brief",
        sourceUrl: "https://example.com/empty",
        brief: "",
        keyFacts: ["One fact"],
        fullText: "Some text.",
      },
    ]);

    expect(() => parseTopicsJson(emptyBrief)).toThrow();
  });

  it("handles markdown-fenced JSON", () => {
    const fenced = '```json\n' + JSON.stringify([
      {
        title: "Fenced",
        sourceUrl: "https://example.com/fenced",
        brief: "Brief description.",
        keyFacts: ["Fact one"],
        fullText: "Full text here with content.",
      },
    ]) + '\n```';

    const result = parseTopicsJson(fenced);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Fenced");
  });
});
```

- [ ] **Step 4: Run parser tests**

```bash
pnpm vitest run lib/topics-json.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass (including existing ones).

- [ ] **Step 6: Generate Prisma client and create migration**

```bash
pnpm prisma generate
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma mastra/lib/topics-json.ts lib/topics-json.test.ts
git commit -m "feat: update Topic model and parser for rich research fields"
```

---

### Task 4: Update Search Agent

**Files:**
- Modify: `mastra/agents/search.ts`

- [ ] **Step 1: Update search agent instructions and add fetchPage tool**

Replace the entire contents of `mastra/agents/search.ts`:

```typescript
import { Agent } from "@mastra/core/agent";
import { memory } from "../memory";
import { webSearchTool } from "../tools/web-search-tool";
import { fetchPageTool } from "../tools/fetch-page-tool";

export const searchAgent = new Agent({
  id: "searchAgent",
  name: "Search Agent",
  description:
    "Researches a niche via web/news search and article scraping, producing structured research notes for downstream agents.",
  instructions: `You are the Search Agent for an AI newsletter pipeline.

Goals:
1. Given a niche, discover fresh stories using the web-search-news tool with multiple targeted queries.
2. For each promising article, call fetch-page to get the full article content.
3. After each scrape, briefly interpret the article's value in natural language so downstream agents see your reasoning in thread memory.
4. When you have enough coverage (aim for 5 articles), respond with ONLY a JSON array (no markdown fences) matching this shape:

[{
  "title": "string",
  "sourceUrl": "string",
  "brief": "string (2-3 sentence summary)",
  "keyFacts": ["string (specific citable fact)", ...],
  "fullText": "string (cleaned article text, ~1500 words max)"
}]

Rules:
- Every entry must use a real URL fetched via fetch-page.
- brief: concise 2-3 sentence summary of what the article covers.
- keyFacts: 3-5 specific, citable facts extracted from the article.
- fullText: the extracted article text, trimmed to approximately 1500 words.
- Be selective — only scrape articles that are substantive and directly relevant.
- Prefer diversity (subtopics) within the niche.
- Do not include markdown fences around the JSON.
- If fetch-page fails for a URL, skip it and try another.`,
  model: "openai/gpt-4o-mini",
  memory,
  tools: {
    webSearch: webSearchTool,
    fetchPage: fetchPageTool,
  },
});
```

- [ ] **Step 2: Verify the build compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add mastra/agents/search.ts
git commit -m "feat: update search agent with fetch-page tool and rich research instructions"
```

---

### Task 5: Database Migration

**Files:**
- Create: Prisma migration (auto-generated)

**Note:** This task requires a running database connection. Ensure `.env` has the correct `DATABASE_URL` before running.

- [ ] **Step 1: Create and apply the migration**

```bash
pnpm prisma migrate dev --name add_rich_research_fields
```

- [ ] **Step 2: Verify migration was applied**

```bash
pnpm prisma migrate status
```

Expected: "Database is up to date."

- [ ] **Step 3: Verify full build**

```bash
pnpm build
```

Expected: successful build.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/
git commit -m "db: add brief, keyFacts, fullText to Topic; drop summary"
```

---

### Task 6: Update API Routes

**Files:**
- Modify: `app/api/newsletters/[id]/issues/route.ts`
- Modify: `app/api/issues/[id]/draft/route.ts`

- [ ] **Step 1: Update the issue creation route**

In `app/api/newsletters/[id]/issues/route.ts`, change the `prisma.topic.createMany` call.

Replace:
```typescript
  await prisma.topic.createMany({
    data: topicsPayload.map((topic) => ({
      title: topic.title,
      summary: topic.summary,
      sourceUrl: topic.sourceUrl,
      issueId: issue.id,
      isApproved: true,
    })),
  });
```

With:
```typescript
  await prisma.topic.createMany({
    data: topicsPayload.map((topic) => ({
      title: topic.title,
      sourceUrl: topic.sourceUrl,
      brief: topic.brief,
      keyFacts: JSON.stringify(topic.keyFacts),
      fullText: topic.fullText,
      issueId: issue.id,
      isApproved: true,
    })),
  });
```

- [ ] **Step 2: Update the draft route**

In `app/api/issues/[id]/draft/route.ts`, change the outline builder.

Replace:
```typescript
    const outline = issue.topics
      .map(
        (topic, index) =>
          `${index + 1}. ${topic.title}\n   Summary: ${topic.summary}\n   Source: ${topic.sourceUrl}`,
      )
      .join("\n");
```

With:
```typescript
    const outline = issue.topics
      .map((topic, index) => {
        let keyFactsList = "";
        try {
          const facts = JSON.parse(topic.keyFacts) as string[];
          keyFactsList = facts.map((f) => `     - ${f}`).join("\n");
        } catch {
          keyFactsList = `     - ${topic.keyFacts}`;
        }
        const fullTextExcerpt = topic.fullText.slice(0, 500);
        return [
          `${index + 1}. ${topic.title}`,
          `   Brief: ${topic.brief}`,
          `   Key Facts:`,
          keyFactsList,
          `   Full Article (excerpt): ${fullTextExcerpt}`,
          `   Source: ${topic.sourceUrl}`,
        ].join("\n");
      })
      .join("\n");
```

- [ ] **Step 3: Verify build compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no type errors. The Prisma client should now expose `brief`, `keyFacts`, `fullText` on the `Topic` type.

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/newsletters/ app/api/issues/
git commit -m "feat: update API routes for rich research topic data"
```

---

### Task 7: Manual Verification in Mastra Studio

**No code changes.** This is a verification task.

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

This starts both Next.js and Mastra Studio.

- [ ] **Step 2: Open Mastra Studio**

Open `http://localhost:4111` in a browser.

- [ ] **Step 3: Test the search agent**

In Studio, select the `searchAgent`. Send a message: `Research niche: "renewable energy 2026".`

Verify:
- The agent makes `web-search-news` calls
- The agent then makes `fetch-page` calls for promising URLs
- The agent's final output is a JSON array with `title`, `sourceUrl`, `brief`, `keyFacts`, `fullText` fields
- No markdown fences around the JSON

- [ ] **Step 4: Smoke test the full pipeline**

Create a newsletter issue through the app UI (or via API):

```bash
curl -X POST http://localhost:3000/api/newsletters/<newsletter-id>/issues \
  -H "Content-Type: application/json" \
  -d '{"niche": "quantum computing"}'
```

Then trigger drafting:

```bash
curl -X POST http://localhost:3000/api/issues/<issue-id>/draft
```

Verify:
- The research phase stores topics with `brief`, `keyFacts`, `fullText` in the database
- The draft contains citations linking to real URLs
- The draft content is richer and more detailed than before

- [ ] **Step 5: Stop dev server**

```bash
# Ctrl+C or kill the process
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run full test suite one last time**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Run full build**

```bash
pnpm build
```

Expected: successful build.

- [ ] **Step 3: Commit any remaining changes**

```bash
git status
git add -A
git commit -m "chore: final cleanup and verification"
```
