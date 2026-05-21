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
