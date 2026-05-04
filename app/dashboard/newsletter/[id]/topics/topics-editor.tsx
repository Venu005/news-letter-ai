"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type NewsletterDetailPayload,
  type TopicRow,
  fetchNewsletterDetail,
} from "@/lib/query/fetch-newsletter-detail";
import { newsletterDetailQueryKey } from "@/lib/query/newsletter-keys";

export type { TopicRow };

function topicsFingerprint(d: NewsletterDetailPayload) {
  return `${d.newsletter.updatedAt}|${d.topics
    .map((t) => [t.id, t.title, t.summary, t.sourceUrl, t.isApproved].join("\u0001"))
    .join("\u0002")}`;
}

export function TopicsEditor({ newsletterId }: { newsletterId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: newsletterDetailQueryKey(newsletterId),
    queryFn: ({ signal }) => fetchNewsletterDetail(newsletterId, { signal }),
  });

  const fp = useMemo(() => topicsFingerprint(data), [data]);

  return (
    <TopicsEditorForm
      key={fp}
      newsletterId={newsletterId}
      initialTopics={data.topics}
      initialNiche={data.newsletter.niche ?? null}
    />
  );
}

function TopicsEditorForm({
  newsletterId,
  initialTopics,
  initialNiche,
}: {
  newsletterId: string;
  initialTopics: TopicRow[];
  initialNiche: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [topics, setTopics] = useState(initialTopics);
  const niche = initialNiche;

  const saveMutation = useMutation({
    mutationFn: async (payload: TopicRow[]) => {
      const res = await fetch(`/api/newsletters/${newsletterId}/topics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: payload.map((t) => ({
            id: t.id,
            title: t.title,
            summary: t.summary,
            sourceUrl: t.sourceUrl,
            isApproved: t.isApproved,
          })),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        topics?: TopicRow[];
      };
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to save topics.",
        );
      }
      if (!body.topics) {
        throw new Error("Invalid save response.");
      }
      return body.topics;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: newsletterDetailQueryKey(newsletterId),
      });
    },
  });

  const hasApproved = topics.some((t) => t.isApproved);

  function updateTopic(id: string, patch: Partial<TopicRow>) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="flex flex-col gap-6">
      {niche ? (
        <p className="text-sm text-muted-foreground">
          Niche: <span className="font-medium text-foreground">{niche}</span>
        </p>
      ) : null}

      {saveMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Failed to save topics."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4">
        {topics.map((t) => (
          <Card key={t.id} size="sm">
            <CardContent className="flex flex-col gap-3 pt-6">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Title
                </span>
                <Input
                  value={t.title}
                  onChange={(e) => updateTopic(t.id, { title: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Summary
                </span>
                <Textarea
                  rows={3}
                  value={t.summary}
                  onChange={(e) => updateTopic(t.id, { summary: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Source URL
                </span>
                <Input
                  value={t.sourceUrl}
                  onChange={(e) => updateTopic(t.id, { sourceUrl: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={t.isApproved}
                  onChange={(e) => updateTopic(t.id, { isApproved: e.target.checked })}
                  className="size-4 rounded border-input"
                />
                Approved for newsletter
              </label>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
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
          onClick={() => router.push(`/dashboard/newsletter/${newsletterId}/draft`)}
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
