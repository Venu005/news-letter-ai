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
