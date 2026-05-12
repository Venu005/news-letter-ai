"use client";

import { Streamdown } from "streamdown";

export function IssueMarkdown({ source }: { source: string }) {
  return (
    <article className="prose prose-neutral max-w-none">
      <Streamdown mode="static">{source}</Streamdown>
    </article>
  );
}
