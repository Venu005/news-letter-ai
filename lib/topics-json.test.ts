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
