"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  type NewsletterDetailPayload,
  fetchNewsletterDetail,
} from "@/lib/query/fetch-newsletter-detail";
import { newsletterDetailQueryKey } from "@/lib/query/newsletter-keys";

function draftStateKey(d: NewsletterDetailPayload) {
  return `${d.newsletter.updatedAt}|${d.newsletter.status}|${(d.newsletter.finalDraft ?? "").length}`;
}

export function DraftEditor({ newsletterId }: { newsletterId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: newsletterDetailQueryKey(newsletterId),
    queryFn: ({ signal }) => fetchNewsletterDetail(newsletterId, { signal }),
  });

  const dk = useMemo(() => draftStateKey(data), [data]);

  return (
    <DraftEditorFields
      key={dk}
      newsletterId={newsletterId}
      initialDraft={data.newsletter.finalDraft ?? ""}
      status={data.newsletter.status}
    />
  );
}

function DraftEditorFields({
  newsletterId,
  initialDraft,
  status,
}: {
  newsletterId: string;
  initialDraft: string;
  status: string;
}) {
  const queryClient = useQueryClient();
  const [draftText, setDraftText] = useState(initialDraft);
  const [publishOk, setPublishOk] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; draft?: string };
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to generate draft.",
        );
      }
      return typeof body.draft === "string" ? body.draft : "";
    },
    onSuccess: (draft) => {
      setDraftText(draft);
      setPublishOk(null);
      void queryClient.invalidateQueries({
        queryKey: newsletterDetailQueryKey(newsletterId),
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/newsletters/${newsletterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalDraft: text }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to save draft.",
        );
      }
    },
    onSuccess: () => {
      setPublishOk(null);
      void queryClient.invalidateQueries({
        queryKey: newsletterDetailQueryKey(newsletterId),
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (text: string) => {
      const saveRes = await fetch(`/api/newsletters/${newsletterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalDraft: text }),
      });
      const saveData = (await saveRes.json().catch(() => ({}))) as { error?: string };
      if (!saveRes.ok) {
        throw new Error(
          typeof saveData.error === "string"
            ? saveData.error
            : "Could not save draft before publishing.",
        );
      }

      const pubRes = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterId }),
      });
      const pubData = (await pubRes.json().catch(() => ({}))) as { error?: string };
      if (!pubRes.ok) {
        throw new Error(
          typeof pubData.error === "string" ? pubData.error : "Publish failed.",
        );
      }
    },
    onSuccess: () => {
      setPublishOk("Published successfully.");
      void queryClient.invalidateQueries({
        queryKey: newsletterDetailQueryKey(newsletterId),
      });
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
