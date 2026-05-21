import { createTool } from "@mastra/core/tools";
import { z } from "zod";

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(html: string): string {
  return decodeBasicEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function parseGoogleNewsRss(xml: string): Array<{ title: string; url: string; snippet: string }> {
  const items: Array<{ title: string; url: string; snippet: string }> = [];
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  for (const block of itemBlocks) {
    const titleMatch = block.match(/<title(?:[^>]*)>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link(?:[^>]*)>([\s\S]*?)<\/link>/i);
    const descMatch = block.match(/<description(?:[^>]*)>([\s\S]*?)<\/description>/i);

    const titleRaw = titleMatch?.[1]?.trim();
    const urlRaw = linkMatch?.[1]?.trim();
    if (!titleRaw || !urlRaw) continue;

    const title = stripHtml(titleRaw);
    const snippet = descMatch?.[1] ? stripHtml(descMatch[1]) : "";
    items.push({ title, url: urlRaw, snippet });
  }

  return items;
}

async function fetchNewsResults(query: string, maxResults: number): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(rssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; NewsletterAI/1.0; +https://example.invalid)",
      Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`News RSS request failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseGoogleNewsRss(xml).slice(0, maxResults);
}

export const googleNewsSearchTool = createTool({
  id: "google-news-search",
  description:
    "Search recent news for a query using Google News RSS. Returns titles, canonical article URLs (via Google News redirects), and short snippets. Call this when you need fresh mainstream news sources for a niche or topic.",
  inputSchema: z.object({
    query: z.string().min(2).describe("Search query (e.g. niche plus qualifiers like year or trend terms)."),
    maxResults: z.number().int().min(3).max(15).optional().default(8),
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
    const results = await fetchNewsResults(query, maxResults ?? 8);
    return { query, results };
  },
});
