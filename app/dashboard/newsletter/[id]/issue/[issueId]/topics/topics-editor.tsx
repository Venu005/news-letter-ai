"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  Save,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveTopics } from "@/lib/mutation/issue-mutations";
import {
  type IssueDetailPayload,
  fetchIssueDetail,
} from "@/lib/query/fetch-issue-detail";
import { issueDetailQueryKey } from "@/lib/query/issue-keys";
import type { Topic } from "@/lib/types/topic";
import { cn } from "@/lib/utils";

function topicsFingerprint(d: IssueDetailPayload) {
  return `${d.issue.updatedAt}|${d.topics
    .map((t) => [t.id, t.title, t.brief, t.sourceUrl, t.isApproved].join("\u0001"))
    .join("\u0002")}`;
}

export function TopicsEditor({
  newsletterId,
  issueId,
}: {
  newsletterId: string;
  issueId: string;
}) {
  const { data } = useSuspenseQuery({
    queryKey: issueDetailQueryKey(issueId),
    queryFn: ({ signal }) => fetchIssueDetail(issueId, { signal }),
  });
  const fp = useMemo(() => topicsFingerprint(data), [data]);
  return (
    <TopicsEditorForm
      key={fp}
      newsletterId={newsletterId}
      issueId={issueId}
      initialTopics={data.topics}
      niche={data.issue.niche}
    />
  );
}

function TopicsEditorForm({
  newsletterId,
  issueId,
  initialTopics,
  niche,
}: {
  newsletterId: string;
  issueId: string;
  initialTopics: Topic[];
  niche: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [topics, setTopics] = useState(initialTopics);

  const saveMutation = useMutation({
    mutationFn: (payload: Topic[]) =>
      saveTopics({
        issueId,
        topics: payload.map((t) => ({
          id: t.id,
          title: t.title,
          sourceUrl: t.sourceUrl,
          isApproved: t.isApproved,
        })),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: issueDetailQueryKey(issueId) }),
  });

  const approvedCount = topics.filter((t) => t.isApproved).length;
  const hasApproved = approvedCount > 0;

  function updateTopic(id: string, patch: Partial<Topic>) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="space-y-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Niche
          </span>
          <p className="text-sm font-medium text-foreground">{niche}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
            <Check className="size-3" aria-hidden="true" />
            {approvedCount} approved
          </span>
          <span className="text-xs text-muted-foreground/70">
            of {topics.length}
          </span>
        </div>
      </div>

      {saveMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Failed to save topics."}
          </AlertDescription>
        </Alert>
      ) : null}

      <ul className="flex flex-col gap-3">
        {topics.map((t, idx) => (
          <li
            key={t.id}
            className={cn(
              "rounded-2xl border bg-card p-5 transition-colors duration-200",
              t.isApproved
                ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-400/30 dark:bg-emerald-500/5"
                : "border-border",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Topic {idx + 1}
              </span>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t.isApproved ? "Approved" : "Approve"}
                </span>
                <span
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
                    t.isApproved ? "bg-emerald-600" : "bg-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    checked={t.isApproved}
                    onChange={(e) =>
                      updateTopic(t.id, { isApproved: e.target.checked })
                    }
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-4 rounded-full bg-background shadow-sm transition-transform duration-200",
                      t.isApproved ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`topic-title-${t.id}`}
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Title
                </label>
                <Input
                  id={`topic-title-${t.id}`}
                  value={t.title}
                  onChange={(e) => updateTopic(t.id, { title: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`topic-summary-${t.id}`}
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Brief
                </label>
                <Textarea
                  id={`topic-summary-${t.id}`}
                  rows={3}
                  value={t.brief}
                  onChange={(e) => updateTopic(t.id, { brief: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`topic-source-${t.id}`}
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Source URL
                </label>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                  <Input
                    id={`topic-source-${t.id}`}
                    value={t.sourceUrl}
                    onChange={(e) =>
                      updateTopic(t.id, { sourceUrl: e.target.value })
                    }
                    placeholder="https://example.com/article"
                    className="flex-1"
                  />
                  {t.sourceUrl ? (
                    <a
                      href={t.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 self-start rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      Open
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-4 z-10 mt-2 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-border bg-background/80 px-4 py-3 backdrop-blur-md supports-backdrop-filter:bg-background/65">
        {!hasApproved ? (
          <span className="mr-auto text-xs text-muted-foreground">
            Approve at least one topic to continue.
          </span>
        ) : (
          <span className="mr-auto text-xs text-muted-foreground">
            {approvedCount} topic{approvedCount === 1 ? "" : "s"} ready for the
            draft.
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={saveMutation.isPending || topics.length === 0}
          onClick={() => saveMutation.mutate(topics)}
          className="cursor-pointer"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden="true" />
              Save
            </>
          )}
        </Button>
        <Button
          type="button"
          disabled={!hasApproved}
          onClick={() =>
            router.push(
              `/dashboard/newsletter/${newsletterId}/issue/${issueId}/draft`,
            )
          }
          className="cursor-pointer"
        >
          Continue
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
