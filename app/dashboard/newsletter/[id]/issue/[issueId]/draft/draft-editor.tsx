"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { marked } from "marked";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IssueStatusBadge } from "@/components/dashboard/issue-status-badge";
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
import { RichTextEditor } from "./rich-text-editor";

function draftStateKey(d: IssueDetailPayload) {
  return `${d.issue.updatedAt}|${d.issue.status}|${(d.issue.finalDraft ?? "").length}`;
}

function countWords(text: string) {
  const stripped = text.replace(/<[^>]+>/g, "").trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).length;
}

function countMinutes(words: number) {
  return Math.max(1, Math.round(words / 220));
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
      setDraftText(marked.parse(result.draft) as string);
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
  const wordCount = countWords(draftText);
  const minutes = countMinutes(wordCount);
  const canPublish =
    draftTrimmed.length > 0 &&
    status !== "PUBLISHED" &&
    status !== "RESEARCHING" &&
    (status === "DRAFTING" || status === "REVIEWING");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </span>
          <IssueStatusBadge status={status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{wordCount.toLocaleString()} words</span>
          <span className="size-1 rounded-full bg-border" aria-hidden="true" />
          <span>~{minutes} min read</span>
        </div>
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
      {publishOk ? (
        <Alert className="border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <AlertDescription className="flex items-center gap-2">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {publishOk}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
              className="cursor-pointer"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Generating
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Generate from topics
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(draftText)}
              className="cursor-pointer"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="size-3.5" aria-hidden="true" />
                  Save draft
                </>
              )}
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={
              publishMutation.isPending ||
              generateMutation.isPending ||
              saveMutation.isPending ||
              !canPublish
            }
            onClick={() => publishMutation.mutate(draftText)}
            className="cursor-pointer"
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Publishing
              </>
            ) : (
              <>
                <Send className="size-3.5" aria-hidden="true" />
                Publish
              </>
            )}
          </Button>
        </div>
        <RichTextEditor
          content={draftText}
          onChange={setDraftText}
          placeholder="Start writing your issue…"
        />
      </div>
    </div>
  );
}
