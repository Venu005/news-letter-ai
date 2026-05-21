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

const MAX_TEXT_LENGTH = 4_000;

export const fetchPageTool = createTool({
  id: "fetch-page",
  description:
    "Fetch a web page and extract its main article content using Mozilla Readability. " +
    "Call this for each promising article URL found via web-search-news. " +
    "Returns cleaned article text (truncated to ~600 words), title, and a short excerpt.",
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
      const truncated = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
      const excerpt = truncated.slice(0, 200);

      return {
        title,
        url,
        text: truncated,
        excerpt,
        siteName,
        length: truncated.length,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
});
