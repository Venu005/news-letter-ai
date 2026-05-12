"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  generateDraft,
  publishIssue,
  saveDraft,
} from "@/lib/mutation/issue-mutations";
import {
  type IssueDetailPayload,
  fetchIssueDetail,
} from "@/lib/query/fetch-issue-detail";
import { issueDetailQueryKey } from "@/lib/query/issue-keys";

function draftStateKey(d: IssueDetailPayload) {
  return `${d.issue.updatedAt}|${d.issue.status}|${(d.issue.finalDraft ?? "").length}`;
}

export function DraftEditor({ issueId }: { issueId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: issueDetailQueryKey(issueId),
    queryFn: ({ signal }) => fetchIssueDetail(issueId, { signal }),
  });
  const dk = useMemo(() => draftStateKey(data), [data]);
  return (
    <DraftEditorFields
      key={dk}
      issueId={issueId}
      initialDraft={data.issue.finalDraft ?? ""}
      status={data.issue.status}
    />
  );
}

function DraftEditorFields({
  issueId,
  initialDraft,
  status,
}: {
  issueId: string;
  initialDraft: string;
  status: string;
}) {
  const queryClient = useQueryClient();
  const [draftText, setDraftText] = useState(initialDraft);
  const [publishOk, setPublishOk] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: issueDetailQueryKey(issueId) });

  const generateMutation = useMutation({
    mutationFn: () => generateDraft({ issueId }),
    onSuccess: (result) => {
      setDraftText(result.draft);
      setPublishOk(null);
      void invalidate();
    },
  });

  const saveMutation = useMutation({
    mutationFn: (text: string) => saveDraft({ issueId, finalDraft: text }),
    onSuccess: () => {
      setPublishOk(null);
      void invalidate();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (text: string) => {
      await saveDraft({ issueId, finalDraft: text });
      return publishIssue({ issueId });
    },
    onSuccess: () => {
      setPublishOk("Published successfully.");
      void invalidate();
    },
  });

  const mutationError =
    generateMutation.error ?? saveMutation.error ?? publishMutation.error;

  const draftTrimmed = draftText.trim();
  const canPublish =
    draftTrimmed.length > 0 &&
    status !== "PUBLISHED" &&
    status !== "RESEARCHING" &&
    (status === "DRAFTING" || status === "REVIEWING");

  return (
    <div className="flex flex-col gap-intel-stack-md">
      {status ? (
        <div className="flex flex-wrap items-center gap-intel-stack-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </span>
          <Badge variant="secondary">{status}</Badge>
        </div>
      ) : null}
      {mutationError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {mutationError instanceof Error ? mutationError.message : "Request failed."}
          </AlertDescription>
        </Alert>
      ) : null}
      {publishOk ? (
        <Alert>
          <AlertDescription>{publishOk}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-intel-stack-sm">
        <Button
          type="button"
          disabled={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
        >
          {generateMutation.isPending ? "Generating…" : "Generate draft"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate(draftText)}
        >
          {saveMutation.isPending ? "Saving…" : "Save draft"}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={
            publishMutation.isPending ||
            generateMutation.isPending ||
            saveMutation.isPending ||
            !canPublish
          }
          onClick={() => publishMutation.mutate(draftText)}
        >
          {publishMutation.isPending ? "Publishing…" : "Publish"}
        </Button>
      </div>
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-foreground text-sm font-medium">Markdown</span>
        <Textarea
          rows={18}
          className="min-h-112 font-mono text-sm"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          spellCheck
        />
      </div>
    </div>
  );
}
