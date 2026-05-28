"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  BookmarkPlus,
  CheckCircle2,
  Loader2,
  Mail,
  Megaphone,
  Send,
  Sparkles,
  Verified,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useIssueWorkflowActionsRegistration } from "@/components/dashboard/issue-workflow-actions";
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
import { draftToEditorHtml, editorHtmlToDraft } from "@/lib/draft-content";
import { extractTitleFromMarkdown } from "@/lib/markdown-title";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { DraftPreview } from "./draft-preview";
import { RichTextEditor } from "./rich-text-editor";

function draftStateKey(d: IssueDetailPayload) {
  return `${d.issue.updatedAt}|${d.issue.status}|${(d.issue.finalDraft ?? "").length}`;
}

function countWords(text: string) {
  const stripped = text.replace(/<[^>]+>/g, "").trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).length;
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
      title={data.issue.title ?? data.issue.niche}
      niche={data.issue.niche}
    />
  );
}

function DraftEditorFields({
  issueId,
  initialDraft,
  status,
  title,
  niche,
}: {
  issueId: string;
  initialDraft: string;
  status: string;
  title: string;
  niche: string;
}) {
  const queryClient = useQueryClient();
  const [editorHtml, setEditorHtml] = useState(() =>
    draftToEditorHtml(initialDraft),
  );
  const [editorKey, setEditorKey] = useState(0);
  const [publishOk, setPublishOk] = useState<string | null>(null);
  const [subject, setSubject] = useState(title);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const debouncedHtml = useDebouncedValue(editorHtml, 150);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: issueDetailQueryKey(issueId) });

  const generateMutation = useMutation({
    mutationFn: () => generateDraft({ issueId }),
    onSuccess: (result) => {
      setEditorHtml(draftToEditorHtml(result.draft));
      setSubject(result.title);
      setEditorKey((k) => k + 1);
      setPublishOk(null);
      void invalidate();
    },
  });

  const saveMutation = useMutation({
    mutationFn: (html: string) =>
      saveDraft({ issueId, finalDraft: editorHtmlToDraft(html) }),
    onSuccess: () => {
      setPublishOk(null);
      void invalidate();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (html: string) => {
      await saveDraft({ issueId, finalDraft: editorHtmlToDraft(html) });
      return publishIssue({ issueId });
    },
    onSuccess: () => {
      setPublishOk("Published successfully.");
      void invalidate();
    },
  });

  const mutationError =
    generateMutation.error ?? saveMutation.error ?? publishMutation.error;

  const draftTrimmed = editorHtml.trim();
  const wordCount = countWords(editorHtml);
  const canPublish =
    draftTrimmed.length > 0 &&
    status !== "PUBLISHED" &&
    status !== "RESEARCHING" &&
    (status === "DRAFTING" || status === "REVIEWING");

  const handleSave = useCallback(() => {
    saveMutation.mutate(editorHtml);
  }, [editorHtml, saveMutation]);

  const handlePublish = useCallback(() => {
    publishMutation.mutate(editorHtml);
  }, [editorHtml, publishMutation]);

  useIssueWorkflowActionsRegistration({
    onSave: handleSave,
    onPublish: handlePublish,
    saveDisabled: saveMutation.isPending || generateMutation.isPending,
    publishDisabled:
      publishMutation.isPending ||
      generateMutation.isPending ||
      saveMutation.isPending ||
      !canPublish,
    savePending: saveMutation.isPending,
    publishPending: publishMutation.isPending,
  });

  const displayTitle =
    subject ||
    extractTitleFromMarkdown(editorHtmlToDraft(editorHtml), niche) ||
    niche;

  return (
    <div className="-mx-6 grid min-h-[calc(100vh-8rem)] grid-cols-1 lg:mx-0 lg:grid-cols-2 lg:gap-0 lg:rounded-xl lg:ring-1 lg:ring-black/[0.06]">
      {/* Editor pane — Notion-style document */}
      <div className="flex flex-col border-b border-neutral-200/80 bg-neutral-50/50 lg:border-b-0 lg:border-r lg:border-neutral-200/80">
        <div className="px-6 pb-2 pt-1 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-neutral-500">Editor</h2>
            {status === "REVIEWING" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <Verified className="size-3" />
                AI verified
              </span>
            ) : null}
            <span className="text-xs text-neutral-400">
              {wordCount.toLocaleString()} words
            </span>
          </div>
        </div>

        <div className="flex rounded-md bg-neutral-100/80 p-0.5 mx-6 mb-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePane("edit")}
            className={cn(
              "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              mobilePane === "edit"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500",
            )}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMobilePane("preview")}
            className={cn(
              "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              mobilePane === "preview"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500",
            )}
          >
            Preview
          </button>
        </div>

        {mutationError ? (
          <Alert variant="destructive" className="mx-6">
            <AlertDescription>
              {mutationError instanceof Error
                ? mutationError.message
                : "Request failed."}
            </AlertDescription>
          </Alert>
        ) : null}
        {publishOk ? (
          <Alert className="mx-6 border-emerald-300/60 bg-emerald-50 text-emerald-900">
            <AlertDescription className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              {publishOk}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className={cn("flex min-h-0 flex-1 flex-col", mobilePane === "preview" && "hidden lg:flex")}>
        {!draftTrimmed && !generateMutation.isPending ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="mb-4 max-w-sm text-sm text-neutral-500">
              No draft yet. Generate one from your approved topics.
            </p>
            <Button
              type="button"
              disabled={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
              className="gap-2"
            >
              <Sparkles className="size-4" />
              Generate from topics
            </Button>
          </div>
        ) : (
          <RichTextEditor
            key={`${initialDraft}:${editorKey}`}
            variant="canvas"
            content={editorHtml}
            onChange={setEditorHtml}
            placeholder="Untitled"
          />
        )}

        {generateMutation.isPending ? (
          <div className="flex items-center gap-2 px-6 py-3 text-xs text-neutral-500">
            <Loader2 className="size-3.5 animate-spin" />
            Generating draft…
          </div>
        ) : null}
        </div>
      </div>

      {/* Preview + settings pane */}
      <div className="flex flex-col bg-neutral-50/30 lg:min-h-0">
        <div
          className={cn(
            "flex min-h-[420px] flex-1 flex-col p-4 lg:p-5",
            mobilePane === "edit" && "hidden lg:flex",
          )}
        >
          <DraftPreview
            html={debouncedHtml}
            device={previewDevice}
            onDeviceChange={setPreviewDevice}
          />
        </div>

        <div className="border-t border-neutral-200/80 bg-white p-5 lg:p-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-400">
            Publish
          </h3>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-[family-name:var(--font-orch-body)] text-orch-label-md text-[var(--intel-on-surface)]">
                Destination Platform
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded border-2 border-[var(--intel-secondary)] bg-[var(--intel-surface-bright)] p-3 font-[family-name:var(--font-orch-body)] text-orch-label-md text-[var(--intel-on-surface)]"
                >
                  <Mail className="size-[18px]" />
                  Resend
                </button>
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="flex items-center justify-center gap-2 rounded border border-[var(--intel-surface-container-high)] bg-[var(--intel-surface-container-lowest)] p-3 font-[family-name:var(--font-orch-body)] text-orch-label-md text-[var(--intel-on-surface-variant)] opacity-60"
                >
                  <Megaphone className="size-[18px]" />
                  Mailchimp
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="publish-subject"
                className="font-[family-name:var(--font-orch-body)] text-orch-label-md text-[var(--intel-on-surface)]"
              >
                Subject Line
              </label>
              <div className="relative">
                <input
                  id="publish-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded border border-[var(--intel-surface-container-high)] bg-[var(--intel-surface-container-lowest)] p-3 pr-10 font-[family-name:var(--font-orch-body)] text-orch-body-md text-[var(--intel-on-surface)] outline-none transition-colors focus:border-[var(--intel-secondary)] focus:ring-1 focus:ring-[var(--intel-secondary)]"
                />
                <button
                  type="button"
                  title="Use draft title"
                  onClick={() => setSubject(displayTitle)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--intel-secondary)] hover:bg-[var(--intel-secondary-fixed)]/50"
                >
                  <Sparkles className="size-[18px]" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4">
              <Button
                type="button"
                disabled={
                  publishMutation.isPending ||
                  generateMutation.isPending ||
                  saveMutation.isPending ||
                  !canPublish
                }
                onClick={handlePublish}
                className="h-12 w-full gap-2 bg-[var(--intel-primary)] font-[family-name:var(--font-orch-body)] text-orch-label-md text-[var(--intel-on-primary)] hover:bg-[var(--intel-primary)]/90"
              >
                {publishMutation.isPending ? (
                  <Loader2 className="size-[18px] animate-spin" />
                ) : (
                  <Send className="size-[18px]" />
                )}
                Publish Now
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled
                className="h-12 w-full gap-2 border-[var(--intel-surface-container-high)] font-[family-name:var(--font-orch-body)] text-orch-label-md"
              >
                <BookmarkPlus className="size-[18px]" />
                Save as Template
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
