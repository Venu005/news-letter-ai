# Tavily Web Search Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Tavily-powered `web-search` tool to give the search agent a second source discovery channel (alongside Google News RSS), enabling broader and more diverse article sourcing.

**Architecture:** Add `@tavily/core` SDK, create `tavily-search-tool.ts` with same input/output shape as existing Google RSS tool, rename existing `web-search-tool.ts` → `google-news-search-tool.ts` for clarity, update search agent to use both.

**Tech Stack:** Mastra (`@mastra/core`), TypeScript, Zod, `@tavily/core`, Vitest

---

### Task 1: Install Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add @tavily/core**

```bash
pnpm add @tavily/core
```

- [ ] **Step 2: Verify install**

```bash
pnpm ls @tavily/core
```

Expected: `@tavily/core 0.7.3` (or later) appears in the dependency tree.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @tavily/core for web search"
```

---

### Task 2: Rename Existing Google RSS Tool

**Files:**
- Rename: `mastra/tools/web-search-tool.ts` → `mastra/tools/google-news-search-tool.ts`
- Modify: `mastra/agents/search.ts`

- [ ] **Step 1: Rename the tool file and update its export name**

Rename the file:

```bash
git mv mastra/tools/web-search-tool.ts mastra/tools/google-news-search-tool.ts
```

In `mastra/tools/google-news-search-tool.ts`, change the export line:

```typescript
// Before:
export const webSearchTool = createTool({

// After:
export const googleNewsSearchTool = createTool({
```

And update the tool `id`:

```typescript
// Before:
  id: "web-search-news",

// After:
  id: "google-news-search",
```

Update the description to reference the new name:

```typescript
  description:
    "Search recent news for a query using Google News RSS. Returns titles, canonical article URLs (via Google News redirects), and short snippets. " +
    "Call this when you need mainstream news sources for a niche or topic.",
```

- [ ] **Step 2: Update the import in search.ts**

In `mastra/agents/search.ts`, change the import:

```typescript
// Before:
import { webSearchTool } from "../tools/web-search-tool";

// After:
import { googleNewsSearchTool } from "../tools/google-news-search-tool";
```

And update the tools object reference (name only, adding `webSearch` for Tavily comes in Task 4):

```typescript
// Before:
  tools: {
    webSearch: webSearchTool,
    fetchPage: fetchPageTool,
  },

// After:
  tools: {
    googleNewsSearch: googleNewsSearchTool,
    fetchPage: fetchPageTool,
  },
```

Update the instructions to use the new tool name — change `web-search-news` to `google-news-search` in the instructions string.

- [ ] **Step 3: Verify build compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: all existing tests pass (30 tests, no changes to test files needed).

- [ ] **Step 5: Commit**

```bash
git add mastra/tools/google-news-search-tool.ts mastra/tools/web-search-tool.ts mastra/agents/search.ts
git commit -m "refactor: rename web-search-tool to google-news-search-tool for clarity"
```

---

### Task 3: Create Tavily Search Tool

**Files:**
- Create: `mastra/tools/tavily-search-tool.ts`
- Create: `lib/tavily-search-tool.test.ts`

- [ ] **Step 1: Write the test**

Create `lib/tavily-search-tool.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";

const MOCK_SEARCH = vi.fn();

vi.mock("@tavily/core", () => ({
  tavily: () => ({
    search: MOCK_SEARCH,
  }),
}));

// vi.mock is hoisted, so the import below uses the mocked version
import { tavilySearchTool } from "../mastra/tools/tavily-search-tool";

const MOCK_TAVILY_RESPONSE = {
  query: "renewable energy",
  results: [
    {
      title: "Solar Breakthrough 2026",
      url: "https://example.com/solar",
      content: "A major advance in perovskite solar cells promises cheaper renewable energy.",
    },
    {
      title: "Wind Power Growth",
      url: "https://example.com/wind",
      content: "Offshore wind capacity doubled in the last year.",
    },
    {
      title: "Battery Storage Innovation",
      url: "https://example.com/battery",
      content: "New solid-state batteries achieve 500Wh/kg density.",
    },
  ],
};

describe("tavilySearchTool", () => {
  it("searches and maps results correctly", async () => {
    vi.stubGlobal("process", {
      ...process,
      env: { ...process.env, TAVILY_API_KEY: "test-key" },
    });
    MOCK_SEARCH.mockResolvedValueOnce(MOCK_TAVILY_RESPONSE);

    const result = (await tavilySearchTool.execute!(
      { query: "renewable energy", maxResults: 5 },
      { abortSignal: new AbortController().signal } as any,
    )) as { query: string; results: Array<{ title: string; url: string; snippet: string }> };

    expect(result.query).toBe("renewable energy");
    expect(result.results).toHaveLength(3);
    expect(result.results[0]).toEqual({
      title: "Solar Breakthrough 2026",
      url: "https://example.com/solar",
      snippet: "A major advance in perovskite solar cells promises cheaper renewable energy.",
    });
    expect(result.results[1].title).toBe("Wind Power Growth");
  });

  it("handles empty results from Tavily", async () => {
    vi.stubGlobal("process", {
      ...process,
      env: { ...process.env, TAVILY_API_KEY: "test-key" },
    });
    MOCK_SEARCH.mockResolvedValueOnce({ query: "nothing", results: [] });

    const result = (await tavilySearchTool.execute!(
      { query: "nothing", maxResults: 5 },
      { abortSignal: new AbortController().signal } as any,
    )) as { query: string; results: Array<{ title: string; url: string; snippet: string }> };

    expect(result.query).toBe("nothing");
    expect(result.results).toHaveLength(0);
  });

  it("uses default maxResults of 5 when not provided", async () => {
    vi.stubGlobal("process", {
      ...process,
      env: { ...process.env, TAVILY_API_KEY: "test-key" },
    });
    MOCK_SEARCH.mockResolvedValueOnce(MOCK_TAVILY_RESPONSE);

    await tavilySearchTool.execute!(
      { query: "renewable energy" },
      { abortSignal: new AbortController().signal } as any,
    );

    expect(MOCK_SEARCH).toHaveBeenCalledWith("renewable energy", {
      max_results: 5,
      include_answer: false,
      search_depth: "basic",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run lib/tavily-search-tool.test.ts
```

Expected: FAIL — `tavilySearchTool` is not defined yet.

- [ ] **Step 3: Create the tool implementation**

Create `mastra/tools/tavily-search-tool.ts`:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { tavily } from "@tavily/core";

function getTavilyClient() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not set");
  }
  return tavily({ apiKey });
}

export const tavilySearchTool = createTool({
  id: "web-search",
  description:
    "Search the web using Tavily. Returns structured results with titles, URLs, and content snippets from across the open web " +
    "(news, blogs, documentation, forums, and independent publications). " +
    "Call this alongside google-news-search for broader source coverage.",
  inputSchema: z.object({
    query: z.string().min(2).describe("Search query for the niche or topic"),
    maxResults: z.number().int().min(3).max(10).optional().default(5),
  }),
  outputSchema: z.object({
    query: z.string(),
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      }),
    ),
  }),
  execute: async ({ query, maxResults }) => {
    const client = getTavilyClient();
    const response = await client.search(query, {
      max_results: maxResults ?? 5,
      include_answer: false,
      search_depth: "basic",
    });

    const results = (response.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url,
      snippet: r.content ?? "",
    }));

    return { query, results };
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run lib/tavily-search-tool.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass (33 total — 30 existing + 3 new).

- [ ] **Step 6: Commit**

```bash
git add mastra/tools/tavily-search-tool.ts lib/tavily-search-tool.test.ts
git commit -m "feat: add Tavily web search tool"
```

---

### Task 4: Update Search Agent with Both Tools

**Files:**
- Modify: `mastra/agents/search.ts`

- [ ] **Step 1: Add Tavily tool and update instructions**

In `mastra/agents/search.ts`, add the Tavily import:

```typescript
import { tavilySearchTool } from "../tools/tavily-search-tool";
```

Update the tools object:

```typescript
  tools: {
    googleNewsSearch: googleNewsSearchTool,
    webSearch: tavilySearchTool,
    fetchPage: fetchPageTool,
  },
```

Update the instructions — replace `goal 1` and add the diversity rule. The full updated agent:

```typescript
import { Agent } from "@mastra/core/agent";
import { memory } from "../memory";
import { googleNewsSearchTool } from "../tools/google-news-search-tool";
import { tavilySearchTool } from "../tools/tavily-search-tool";
import { fetchPageTool } from "../tools/fetch-page-tool";

export const searchAgent = new Agent({
  id: "searchAgent",
  name: "Search Agent",
  description:
    "Researches a niche via multiple web/news search channels and article scraping, producing structured research notes for downstream agents.",
  instructions: `You are the Search Agent for an AI newsletter pipeline.

Goals:
1. Given a niche, discover fresh stories using the google-news-search and web-search tools with multiple targeted queries. Use both tools to get diverse sources — google-news-search for mainstream news, web-search (Tavily) for blogs, forums, and independent publications.
2. For each promising article, call fetch-page to get the full article content.
3. After each scrape, briefly interpret the article's value in natural language so downstream agents see your reasoning in thread memory.
4. When you have enough coverage (aim for 3-4 articles), respond with ONLY a JSON array (no markdown fences) matching this shape:

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
- fullText: the extracted article text from fetch-page (use as-is, the tool provides a truncated version).
- Be selective — only scrape articles that are substantive and directly relevant.
- Prefer diversity (subtopics) within the niche.
- Prefer source diversity — mix results from both search tools when possible.
- Do not include markdown fences around the JSON.
- If a tool fails for a URL or query, skip it and try another.`,
  model: "openai/gpt-4o-mini",
  memory,
  tools: {
    googleNewsSearch: googleNewsSearchTool,
    webSearch: tavilySearchTool,
    fetchPage: fetchPageTool,
  },
});
```

- [ ] **Step 2: Verify build compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
```

Expected: all 33 tests pass.

- [ ] **Step 4: Commit**

```bash
git add mastra/agents/search.ts
git commit -m "feat: add Tavily web search to search agent for source diversity"
```

---

### Task 5: Add TAVILY_API_KEY to .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add the env var**

Add to `.env.example` after the existing API key section:

```bash
# ─── Tavily Web Search ──────────────────────────────────────────────────────────
# TAVILY_API_KEY="tvly-..."
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add TAVILY_API_KEY to .env.example"
```

---

### Task 6: Manual Verification

**No code changes.** This is a verification task.

**Prerequisite:** Get a Tavily API key from https://tavily.com and add it to `.env`:

```bash
TAVILY_API_KEY="tvly-..."
```

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Open Mastra Studio**

Open `http://localhost:4111` in a browser.

- [ ] **Step 3: Test the search agent**

In Studio, select `searchAgent`. Send: `Research niche: "renewable energy 2026".`

Verify:
- The agent calls `google-news-search` (Google RSS)
- The agent also calls `web-search` (Tavily)
- Results from both tools are visible in the thread
- The agent scrapes URLs from both sources
- Final output is the standard JSON array

- [ ] **Step 4: Test the full pipeline**

Create and draft an issue via the API or UI:

```bash
curl -X POST http://localhost:3000/api/newsletters/<newsletter-id>/issues \
  -H "Content-Type: application/json" \
  -d '{"niche": "quantum computing 2026"}'
```

Verify the resulting newsletter draft cites sources from both Google News and the broader web — not just Google RSS.

- [ ] **Step 5: Stop dev server**

```bash
# Ctrl+C or kill the process
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all 33 tests pass.

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
