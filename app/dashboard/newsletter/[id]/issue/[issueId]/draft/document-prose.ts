import { cn } from "@/lib/utils";

/** Medium-style document typography for editor + preview parity. */
export const notionDocumentProse = cn(
  "prose prose-neutral max-w-none dark:prose-invert",
  "font-[family-name:var(--font-instrument-serif)] text-[21px] leading-[1.6] text-neutral-800",
  "prose-headings:font-[family-name:var(--font-orch-heading)] prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-neutral-900",
  "prose-h1:mb-6 prose-h1:mt-8 prose-h1:text-[34px] prose-h1:leading-[1.15] prose-h1:font-black",
  "prose-h2:mb-4 prose-h2:mt-10 prose-h2:text-[26px] prose-h2:leading-[1.2]",
  "prose-h3:mb-3 prose-h3:mt-8 prose-h3:text-[22px] prose-h3:leading-[1.25]",
  "prose-p:my-5 prose-p:text-[21px] prose-p:leading-[1.6] prose-p:text-neutral-800",
  "prose-strong:font-bold prose-strong:text-neutral-900",
  "prose-a:text-neutral-900 prose-a:no-underline prose-a:font-medium prose-a:decoration-neutral-400 hover:prose-a:text-neutral-600",
  "prose-blockquote:border-l-[3px] prose-blockquote:border-neutral-800 prose-blockquote:pl-5 prose-blockquote:italic prose-blockquote:text-neutral-600 prose-blockquote:my-6",
  "prose-ul:my-5 prose-ol:my-5 prose-li:my-1.5 prose-li:text-[21px] prose-li:text-neutral-800 prose-li:leading-[1.6]",
  "prose-code:rounded prose-code:bg-neutral-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.9em] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
);
