# Search Agent Rich Research Enhancement

**Date:** 2026-05-20

## Summary

The search agent currently only fetches Google News RSS headlines and short snippets. The writer agent drafts newsletters from those thin summaries, resulting in shallow content. This design gives the search agent the ability to scrape full articles and produce structured research notes, giving the writer agent much richer material.

## Architecture

The search agent's tool set expands from 1 tool to 2:

| Tool | ID | Status |
|------|-----|--------|
| `web-search-news` | `web-search-news` | Existing, unchanged |
| `fetch-page` | `fetch-page` | **New** |

The search agent orchestrates both tools: search for stories via Google News RSS → pick the best URLs → scrape each with `fetch-page` → produce structured research notes as its final output.

The `compile-research` tool considered during design was rejected — the agent's LLM produces the structured notes naturally through its reasoning across thread history. No additional tool needed.

## New Tool: `fetch-page`

### Dependencies

Added via `pnpm`:

- `@mozilla/readability` — extracts main article content from HTML
- `jsdom` — DOM parsing for Readability
- `@types/jsdom` (dev)

### Tool Definition

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

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
    // Implementation below
  },
});
```

### Execute Flow

1. `fetch(url)` with 15s timeout and browser-like `User-Agent` header
2. Check `content-type` includes `text/html`; return error if not
3. Parse HTML with `jsdom`, extract via `Readability`
4. If Readability fails (SPA, non-article), fall back to stripping tags and returning raw text
5. Compute `excerpt` as first ~200 characters of `text`
6. Return `{ title, url, text, excerpt, siteName, length }`

### Error Handling

If fetch fails or the page is not HTML, return an error that the agent can reason about. The agent is instructed to skip failed URLs and try alternatives.

## Search Agent Instruction Changes

The search agent instructions change from producing lightweight `[{title, summary, sourceUrl}]` to producing richer research notes with full article content.

### Updated Instructions

```
You are the Search Agent for an AI newsletter pipeline.

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
```

### Tool Registration

```typescript
tools: {
  webSearch: webSearchTool,
  fetchPage: fetchPageTool,
}
```

### maxSteps

Remains at 24 — sufficient for ~8 search calls + 8 fetches + reasoning.

## Schema Changes

### `mastra/lib/topics-json.ts`

Update `newsletterTopicSchema`:

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

The old field `summary` is replaced by `brief` + `keyFacts` + `fullText`. The parser function `parseTopicsJson` remains unchanged structurally.

### Prisma Schema

Add fields to the `Topic` model:

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

The old `summary` field is removed. `keyFacts` is stored as a JSON string (SQLite has no native array type).

### Prisma Migration

Requires a new migration to add `brief`, `keyFacts`, `fullText` and drop `summary`. SQLite-compatible migration commands.

## API Route Changes

### `app/api/newsletters/[id]/issues/route.ts`

Changes:
- `topic.summary` → `topic.brief` when calling `prisma.topic.createMany`
- Add `keyFacts: JSON.stringify(topic.keyFacts)` and `fullText: topic.fullText`

### `app/api/issues/[id]/draft/route.ts`

The outline passed to the writer agent changes from:

```
1. {title}
   Summary: {summary}
   Source: {sourceUrl}
```

To:

```
1. {title}
   Brief: {brief}
   Key Facts:
     - {keyFact1}
     - {keyFact2}
     - {keyFact3}
   Full Article (excerpt): {first 500 chars of fullText}
   Source: {sourceUrl}
```

## Files Changed

| File | Change |
|------|--------|
| `mastra/tools/fetch-page-tool.ts` | **New** — fetch + Readability tool |
| `mastra/tools/web-search-tool.ts` | No changes |
| `mastra/agents/search.ts` | Updated instructions, add `fetchPage` tool |
| `mastra/agents/writer.ts` | No changes (instructions already reference thread memory) |
| `mastra/agents/editor.ts` | No changes |
| `mastra/lib/topics-json.ts` | Update schema: add `brief`, `keyFacts`, `fullText`; remove `summary` |
| `prisma/schema.prisma` | Update `Topic` model |
| `app/api/newsletters/[id]/issues/route.ts` | Use new field names |
| `app/api/issues/[id]/draft/route.ts` | Richer outline for writer |
| `package.json` | Add `@mozilla/readability`, `jsdom`, `@types/jsdom` |

## Files Not Changed

- `mastra/index.ts` — tools are imported directly in agent files, not registered here
- `mastra/memory.ts` — no changes to storage
- `mastra/workflows/weather-workflow.ts` — unrelated
- `mastra/tools/weather-tool.ts` — unrelated

## Edge Cases

- **Readability fails (SPA/non-article):** Fall back to tag-stripped raw text so the agent still gets content
- **Fetch timeout:** 15s timeout per URL; agent sees error and moves to next URL
- **Non-HTML response:** Check `content-type`; return structured error
- **Agent scrapes too many articles:** maxSteps=24 bounds total tool calls; instructions say "aim for 5"
- **Agent scrapes same URL twice:** Acceptable — the agent should be selective enough to avoid this; duplicates in output won't break anything
- **Large articles:** `fullText` is truncated to ~1500 words. The `fetch-page` tool returns the full extracted text (no truncation in tool code). The search agent's instructions tell it to trim `fullText` to ~1500 words in its final JSON output. The parser (`topics-json.ts`) accepts any length — truncation is the agent's responsibility.
- **Empty keyFacts array:** Schema requires `min(1)` — parser will reject

## Testing Strategy

- Unit tests for `fetch-page` tool: mock `fetch`, verify Readability extraction and fallback
- Unit tests for updated `parseTopicsJson`: valid JSON with new fields, missing fields, malformed JSON
- Integration: verify the search agent can make `web-search-news` → `fetch-page` calls in sequence
- Manual: run `npm run dev`, trigger a newsletter issue creation, verify richer topics are stored
