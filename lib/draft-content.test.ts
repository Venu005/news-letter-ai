import { describe, expect, it } from "vitest";
import { draftToEditorHtml, editorHtmlToDraft } from "./draft-content";

describe("draftToEditorHtml", () => {
  it("converts markdown headings to HTML", () => {
    const html = draftToEditorHtml("# Title\n\n**Bold** text");
    expect(html).toContain("<h1");
    expect(html).toContain("Title");
    expect(html).toContain("<strong>Bold</strong>");
  });

  it("passes through HTML unchanged", () => {
    const input = "<h1>Title</h1><p>Hello</p>";
    expect(draftToEditorHtml(input)).toBe(input);
  });

  it("returns empty string for blank input", () => {
    expect(draftToEditorHtml("")).toBe("");
    expect(draftToEditorHtml("   ")).toBe("");
  });
});

describe("editorHtmlToDraft", () => {
  it("converts HTML back to markdown", () => {
    const md = editorHtmlToDraft("<h1>Title</h1><p><strong>Bold</strong> text</p>");
    expect(md).toContain("# Title");
    expect(md).toContain("**Bold**");
  });

  it("passes through markdown unchanged", () => {
    const input = "# Title\n\nBody";
    expect(editorHtmlToDraft(input)).toBe(input);
  });
});
