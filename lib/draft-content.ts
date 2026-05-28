import { marked } from "marked";
import TurndownService from "turndown";

function isHtml(content: string): boolean {
  return /^\s*</.test(content);
}

const turndown = new TurndownService({ headingStyle: "atx" });

/** Markdown (or HTML) from storage → HTML for TipTap. */
export function draftToEditorHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (isHtml(trimmed)) return content;
  return marked.parse(trimmed) as string;
}

/** TipTap HTML → Markdown for storage and publishing. */
export function editorHtmlToDraft(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";
  if (!isHtml(trimmed)) return trimmed;
  return turndown.turndown(html);
}
