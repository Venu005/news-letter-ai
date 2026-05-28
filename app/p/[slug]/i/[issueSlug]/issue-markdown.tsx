"use client";

import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import { notionDocumentProse } from "@/app/dashboard/newsletter/[id]/issue/[issueId]/draft/document-prose";

function isHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content.trim());
}

export function IssueMarkdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const articleClass = cn(notionDocumentProse, className);

  if (isHtml(source)) {
    return (
      <article
        className={articleClass}
        dangerouslySetInnerHTML={{ __html: source }}
      />
    );
  }

  return (
    <article className={articleClass}>
      <Streamdown mode="static">{source}</Streamdown>
    </article>
  );
}
