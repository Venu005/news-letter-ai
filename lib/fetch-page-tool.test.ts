import { describe, expect, it, vi } from "vitest";
import { fetchPageTool } from "../mastra/tools/fetch-page-tool";

const SAMPLE_HTML = `<!DOCTYPE html><html><head><title>Test Article</title></head><body><article><h1>Test Article</h1><p>This is the first paragraph of a test article. It contains enough content to be meaningful for extraction purposes. We need multiple paragraphs to make the excerpt work properly.</p><p>This is the second paragraph with additional content about the topic at hand.</p></article></body></html>`;

const RAW_HTML = `<!DOCTYPE html><html><head><title>No Article Tag</title></head><body><h1>No Article Tag</h1><p>Content without semantic markup. Still useful for fallback extraction. Enough text here to produce a proper excerpt for testing purposes.</p><p>More fallback content that should be captured.</p></body></html>`;

describe("fetchPageTool", () => {
  it("extracts article content using Readability", async () => {
    vi.stubGlobal(
      "fetch",
      () =>
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
    vi.stubGlobal(
      "fetch",
      () =>
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
    vi.stubGlobal(
      "fetch",
      () =>
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
