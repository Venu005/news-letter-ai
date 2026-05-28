"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  GripVertical,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateDraft, saveTopics } from "@/lib/mutation/issue-mutations";
import {
  type IssueDetailPayload,
  fetchIssueDetail,
} from "@/lib/query/fetch-issue-detail";
import { issueDetailQueryKey } from "@/lib/query/issue-keys";
import { sourceHostname, sourceInitial } from "@/lib/source-badge";
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
    />
  );
}

function TopicsEditorForm({
  newsletterId,
  issueId,
  initialTopics,
}: {
  newsletterId: string;
  issueId: string;
  initialTopics: Topic[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [topics, setTopics] = useState(initialTopics);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const generateMutation = useMutation({
    mutationFn: async () => {
      await saveTopics({
        issueId,
        topics: topics.map((t) => ({
          id: t.id,
          title: t.title,
          sourceUrl: t.sourceUrl,
          isApproved: t.isApproved,
        })),
      });
      return generateDraft({ issueId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: issueDetailQueryKey(issueId) });
      router.push(
        `/dashboard/newsletter/${newsletterId}/issue/${issueId}/draft`,
      );
    },
  });

  const approvedCount = topics.filter((t) => t.isApproved).length;
  const hasApproved = approvedCount > 0;
  const mutationError = saveMutation.error ?? generateMutation.error;

  function updateTopic(id: string, patch: Partial<Topic>) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function toggleApproved(id: string) {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isApproved: !t.isApproved } : t)),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--intel-surface-container-highest)] pb-6">
        <div>
          <h2 className="font-[family-name:var(--font-orch-heading)] text-orch-h2 text-[var(--intel-on-surface)]">
            Outline &amp; Research Review
          </h2>
          <div className="mt-3 flex w-fit items-center gap-2 rounded-full bg-[var(--intel-secondary-fixed)]/30 px-3 py-1.5">
            <CheckCircle2 className="size-[18px] text-[var(--intel-secondary)]" />
            <span className="font-[family-name:var(--font-orch-body)] text-orch-label-sm text-[var(--intel-on-secondary-fixed)]">
              Search Agent found {topics.length} relevant topic
              {topics.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <Button
          type="button"
          disabled={!hasApproved || generateMutation.isPending || saveMutation.isPending}
          onClick={() => generateMutation.mutate()}
          className="h-11 gap-2 bg-[var(--intel-primary)] px-6 font-[family-name:var(--font-orch-body)] text-orch-label-md text-[var(--intel-on-primary)] hover:bg-[var(--intel-primary)]/90"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="size-[18px] animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="size-[18px]" />
              Generate Draft
            </>
          )}
        </Button>
      </div>

      {mutationError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {mutationError instanceof Error
              ? mutationError.message
              : "Request failed."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="max-w-4xl space-y-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-orch-heading)] text-lg text-[var(--intel-on-surface)]">
            Topics for this issue
          </h3>
          <span className="font-[family-name:var(--font-orch-body)] text-orch-body-sm text-[var(--intel-on-surface-variant)]">
            {approvedCount} approved · click to toggle
          </span>
        </div>

        <ul className="space-y-4">
          {topics.map((topic) => (
            <li
              key={topic.id}
              className={cn(
                "group relative flex gap-4 rounded-lg border bg-[var(--intel-surface-container-lowest)] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-colors",
                topic.isApproved
                  ? "border-[var(--intel-secondary)]/40"
                  : "border-[var(--intel-surface-container-highest)] hover:border-[var(--intel-secondary)]/30",
              )}
            >
              <GripVertical
                className="mt-1 size-5 shrink-0 text-[var(--intel-on-surface-variant)] opacity-40"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                {editingId === topic.id ? (
                  <div className="space-y-3">
                    <Input
                      value={topic.title}
                      onChange={(e) =>
                        updateTopic(topic.id, { title: e.target.value })
                      }
                      className="font-[family-name:var(--font-orch-heading)] text-orch-body-lg"
                    />
                    <Textarea
                      rows={3}
                      value={topic.brief}
                      onChange={(e) =>
                        updateTopic(topic.id, { brief: e.target.value })
                      }
                    />
                    <Input
                      value={topic.sourceUrl}
                      onChange={(e) =>
                        updateTopic(topic.id, { sourceUrl: e.target.value })
                      }
                      placeholder="https://"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          saveMutation.mutate(topics);
                          setEditingId(null);
                        }}
                      >
                        Done
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => toggleApproved(topic.id)}
                        className="text-left"
                      >
                        <h4 className="font-[family-name:var(--font-orch-heading)] text-orch-body-lg text-[var(--intel-on-surface)]">
                          {topic.title}
                        </h4>
                      </button>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setEditingId(topic.id)}
                          className="flex size-8 items-center justify-center rounded text-[var(--intel-on-surface-variant)] transition-colors hover:bg-[var(--intel-surface-container-high)]"
                        >
                          <Pencil className="size-[18px]" />
                        </button>
                        <button
                          type="button"
                          title="Remove from issue"
                          onClick={() => toggleApproved(topic.id)}
                          className="flex size-8 items-center justify-center rounded text-[var(--intel-error)] transition-colors hover:bg-[var(--intel-error-container)]"
                        >
                          <Trash2 className="size-[18px]" />
                        </button>
                      </div>
                    </div>
                    <p className="mb-4 line-clamp-2 font-[family-name:var(--font-orch-body)] text-orch-body-sm text-[var(--intel-on-surface-variant)]">
                      {topic.brief}
                    </p>
                    {topic.sourceUrl ? (
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded border border-[var(--intel-surface-container-high)] bg-[var(--intel-surface-container)] px-2 py-1 font-[family-name:var(--font-orch-body)] text-orch-label-sm text-[var(--intel-on-surface-variant)]">
                          <span className="flex size-3.5 items-center justify-center rounded bg-[var(--intel-primary)] text-[8px] font-bold text-white">
                            {sourceInitial(topic.sourceUrl)}
                          </span>
                          {sourceHostname(topic.sourceUrl)}
                        </span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {!hasApproved ? (
          <p className="text-center font-[family-name:var(--font-orch-body)] text-orch-body-sm text-[var(--intel-on-surface-variant)]">
            Approve at least one topic to generate a draft.
          </p>
        ) : null}
      </div>
    </div>
  );
}
