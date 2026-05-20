"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, ExternalLink, FileText } from "lucide-react";
import { IssueStatusBadge } from "@/components/dashboard/issue-status-badge";
import { fetchNewsletterDetail } from "@/lib/query/fetch-newsletter-detail";
import { newsletterDetailQueryKey } from "@/lib/query/newsletter-keys";

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function IssuesList({ newsletterId }: { newsletterId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: newsletterDetailQueryKey(newsletterId),
    queryFn: ({ signal }) => fetchNewsletterDetail(newsletterId, { signal }),
  });

  if (data.issues.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-6">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">No issues yet</p>
          <p className="text-sm text-muted-foreground">
            Start one above by picking a niche to research.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.issues.map((issue) => {
        const isPublished = issue.status === "PUBLISHED" && issue.slug;
        const editTarget =
          issue.status === "REVIEWING" || issue.status === "PUBLISHED"
            ? "draft"
            : "topics";
        const dateLabel = issue.publishedAt
          ? `Published ${formatDate(issue.publishedAt)}`
          : `Updated ${formatDate(issue.updatedAt)}`;
        const editHref = `/dashboard/newsletter/${newsletterId}/issue/${issue.id}/${editTarget}`;
        return (
          <li
            key={issue.id}
            className="group/issue relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors duration-200 hover:border-foreground/30 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <Link
              href={editHref}
              aria-label={`${issue.status === "PUBLISHED" ? "View" : "Edit"} ${issue.title ?? issue.niche}`}
              className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            />
            <div className="relative flex min-w-0 flex-col gap-1">
              <h3 className="truncate text-base font-medium text-foreground">
                {issue.title ?? issue.niche}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <IssueStatusBadge status={issue.status} />
                <span>{dateLabel}</span>
              </div>
            </div>
            <div className="relative flex flex-wrap items-center gap-3 text-xs">
              {isPublished ? (
                <Link
                  href={`/p/${data.newsletter.slug}/i/${issue.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
                >
                  Public link
                  <ExternalLink className="size-3" aria-hidden="true" />
                </Link>
              ) : null}
              <span className="inline-flex items-center gap-1 text-muted-foreground transition-colors duration-200 group-hover/issue:text-foreground">
                {issue.status === "PUBLISHED" ? "View" : "Edit"}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
