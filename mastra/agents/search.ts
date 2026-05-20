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
