# Tavily Web Search Tool

**Date:** 2026-05-21

## Summary

The search agent currently discovers sources only via Google News RSS (`web-search-news`). Add a Tavily-powered `web-search` tool that searches the open web (blogs, independent publications, forums, documentation) for broader and more diverse source coverage. The agent can use both search tools independently and then scrape promising URLs with the existing `fetch-page` tool.

## Architecture

The search agent's tool set expands from 2 to 3:

| Tool | ID | Source | Status |
|------|-----|--------|--------|
| `google-news-search` | `google-news-search` | Google News RSS | Renamed (was `web-search-news`) |
| `fetch-page` | `fetch-page` | Readability scraper | Existing, unchanged |
| `web-search` | `web-search` | Tavily API | **New** |

To avoid filename confusion, rename the existing tool file:

| Before | After |
|--------|-------|
| `mastra/tools/web-search-tool.ts` | `mastra/tools/google-news-search-tool.ts` |

Export rename: `webSearchTool` → `googleNewsSearchTool`.

## New Tool: `web-search` (Tavily)

### Dependencies

Added via `pnpm`:

- `@tavily/core` — official Tavily TypeScript SDK

### Environment Variable

`TAVILY_API_KEY` in `.env` — get a free API key from [tavily.com](https://tavily.com) (1K queries/month free tier).

### Tool Definition

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { tavily } from "@tavily/core";

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

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
    const response = await tavilyClient.search(query, {
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

### Input/Output Shape

Same shape as `google-news-search` (`web-search-news`): `{ query, results: [{ title, url, snippet }] }`. The agent treats both search tools as interchangeable discovery methods — it calls one or both, evaluates the URLs, then scrapes with `fetch-page`.

### Error Handling

If `TAVILY_API_KEY` is unset, the tool throws on first call. The agent's existing instructions already handle tool failures: "If fetch-page fails for a URL, skip it and try another." Same logic applies — the agent can fall back to Google RSS if Tavily is unavailable.

## File Rename: Google News Search Tool

Rename `mastra/tools/web-search-tool.ts` → `mastra/tools/google-news-search-tool.ts`.

Export rename: `webSearchTool` → `googleNewsSearchTool`.

Tool ID rename: `"web-search-news"` → `"google-news-search"`.

Update the single import in `mastra/agents/search.ts`.

This rename is purely for clarity — the tool's behavior is unchanged.

## Search Agent Instruction Updates

Minimal change — mention both search tools. Replace:

> "discover fresh stories using the web-search-news tool with multiple targeted queries"

With:

> "discover fresh stories using the google-news-search and web-search tools with multiple targeted queries. Use both tools to get diverse sources — google-news-search for mainstream news, web-search for blogs, forums, and independent publications."

Add to the `Rules` section:

> "Prefer source diversity — mix results from both search tools when possible."

### Tool Registration

```typescript
tools: {
  googleNewsSearch: googleNewsSearchTool,
  webSearch: tavilySearchTool,
  fetchPage: fetchPageTool,
}
```

### maxSteps

Remains at 24. With 3 tools, the agent might make ~6 search calls (3 RSS + 3 Tavily) + 4 fetches + reasoning = well within 24.

## Files Changed

| File | Change |
|------|--------|
| `mastra/tools/google-news-search-tool.ts` | Renamed from `web-search-tool.ts`, export renamed |
| `mastra/tools/tavily-search-tool.ts` | **New** — Tavily search tool |
| `mastra/tools/fetch-page-tool.ts` | No changes |
| `mastra/agents/search.ts` | Updated imports, tools, instructions |
| `package.json` | Add `@tavily/core` |
| `.env.example` | Add `TAVILY_API_KEY` |

## Files Not Changed

- `mastra/index.ts` — tools imported directly in agent files
- `mastra/memory.ts` — no changes
- `app/api/` — no changes to API routes
- `prisma/` — no schema changes

## Testing Strategy

- Unit tests for `tavilySearchTool`: mock `tavilyClient.search`, verify result mapping
- Unit tests for updated `googleNewsSearchTool`: verify rename didn't break behavior (existing tests should still pass)
- Verify both tools can coexist on the search agent
- Manual: trigger issue creation, verify the agent calls both `google-news-search` and `web-search`

## Edge Cases

- **TAVILY_API_KEY unset:** Tool throws on first call; agent falls back to Google RSS per existing error-handling behavior
- **Tavily returns 0 results:** Agent sees empty array, tries different query or falls back to Google RSS
- **Both tools return same URLs:** The agent's `fetch-page` call on a duplicate URL is harmless — duplicates in the final JSON are unlikely since the agent is instructed to be selective
- **Tavily free tier rate limit (1K/month):** Acceptable for development/demo usage; upgrade to paid tier for production
