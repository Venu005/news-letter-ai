"use client";

import { Streamdown } from "streamdown";

export function IssueMarkdown({ source }: { source: string }) {
  return (
    <article
      className="prose prose-neutral max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-foreground prose-a:underline-offset-4 prose-a:transition-colors hover:prose-a:text-foreground/70 prose-img:rounded-xl prose-img:border prose-img:border-border dark:prose-invert"
      style={{ fontFamily: "var(--font-hero-body)" }}
    >
      <Streamdown mode="static">{source}</Streamdown>
    </article>
  );
}
