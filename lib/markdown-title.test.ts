import { describe, expect, it } from "vitest";
import { extractTitleFromMarkdown } from "./markdown-title";

describe("extractTitleFromMarkdown", () => {
  it("returns the first ATX H1 trimmed", () => {
    expect(extractTitleFromMarkdown("# Heat pumps go mainstream\n\nBody")).toBe(
      "Heat pumps go mainstream",
    );
  });

  it("ignores leading whitespace and blank lines", () => {
    expect(extractTitleFromMarkdown("\n\n   # Hello world  \n")).toBe("Hello world");
  });

  it("falls back when no H1 exists", () => {
    expect(extractTitleFromMarkdown("## Subhead only\n\nBody", "fallback")).toBe(
      "fallback",
    );
  });

  it("returns null when no H1 and no fallback", () => {
    expect(extractTitleFromMarkdown("just a paragraph")).toBeNull();
  });

  it("does not match ##, ###, etc as H1", () => {
    expect(extractTitleFromMarkdown("## Not an H1\n# Real H1")).toBe("Real H1");
  });

  it("strips trailing # characters (closed ATX)", () => {
    expect(extractTitleFromMarkdown("# Title ##")).toBe("Title");
  });

  it("returns null on empty/whitespace input", () => {
    expect(extractTitleFromMarkdown("")).toBeNull();
    expect(extractTitleFromMarkdown("   \n  ")).toBeNull();
  });
});
