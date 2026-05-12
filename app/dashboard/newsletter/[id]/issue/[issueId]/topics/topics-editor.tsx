"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveTopics } from "@/lib/mutation/issue-mutations";
import {
  type IssueDetailPayload,
  fetchIssueDetail,
} from "@/lib/query/fetch-issue-detail";
import { issueDetailQueryKey } from "@/lib/query/issue-keys";
import type { Topic } from "@/lib/types/topic";

function topicsFingerprint(d: IssueDetailPayload) {
  return `${d.issue.updatedAt}|${d.topics
    .map((t) => [t.id, t.title, t.summary, t.sourceUrl, t.isApproved].join("\u0001"))
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
          summary: t.summary,
          sourceUrl: t.sourceUrl,
          isApproved: t.isApproved,
        })),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: issueDetailQueryKey(issueId) }),
  });

  const hasApproved = topics.some((t) => t.isApproved);

  function updateTopic(id: string, patch: Partial<Topic>) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="flex flex-col gap-intel-stack-lg">
      <p className="text-sm text-muted-foreground">
        Niche: <span className="font-medium text-foreground">{niche}</span>
      </p>
      {saveMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Failed to save topics."}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-intel-stack-md">
        {topics.map((t) => (
          <Card key={t.id} size="sm">
            <CardContent className="flex flex-col gap-intel-stack-md pt-6">
              <div className="flex flex-col gap-intel-stack-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Title
                </span>
                <Input
                  value={t.title}
                  onChange={(e) => updateTopic(t.id, { title: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-intel-stack-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Summary
                </span>
                <Textarea
                  rows={3}
                  value={t.summary}
                  onChange={(e) => updateTopic(t.id, { summary: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-intel-stack-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Source URL
                </span>
                <Input
                  value={t.sourceUrl}
                  onChange={(e) => updateTopic(t.id, { sourceUrl: e.target.value })}
                />
              </div>
              <label className="text-foreground flex items-center gap-intel-stack-sm text-sm">
                <input
                  type="checkbox"
                  checked={t.isApproved}
                  onChange={(e) => updateTopic(t.id, { isApproved: e.target.checked })}
                  className="size-4 rounded border-input"
                />
                Approved for article
              </label>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-intel-stack-sm">
        <Button
          type="button"
          disabled={saveMutation.isPending || topics.length === 0}
          onClick={() => saveMutation.mutate(topics)}
        >
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasApproved}
          onClick={() =>
            router.push(
              `/dashboard/newsletter/${newsletterId}/issue/${issueId}/draft`,
            )
          }
        >
          Continue to draft
        </Button>
      </div>
      {!hasApproved ? (
        <Alert>
          <AlertDescription>Approve at least one topic to continue.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
