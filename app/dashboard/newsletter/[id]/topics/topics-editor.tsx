"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export type TopicRow = {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  isApproved: boolean;
  newsletterId: string;
};

export function TopicsEditor({ newsletterId }: { newsletterId: string }) {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [niche, setNiche] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/newsletters/${newsletterId}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setError(typeof data.error === "string" ? data.error : "Newsletter not found.");
        setTopics([]);
        setNiche(null);
        return;
      }
      if (!res.ok) {
        setError("Could not load newsletter.");
        return;
      }
      const nl = data.newsletter as { niche?: string };
      setNiche(nl.niche ?? null);
      setTopics(data.topics as TopicRow[]);
    } finally {
      setLoading(false);
    }
  }, [newsletterId]);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  async function saveTopics() {
    if (topics.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/newsletters/${newsletterId}/topics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: topics.map((t) => ({
            id: t.id,
            title: t.title,
            summary: t.summary,
            sourceUrl: t.sourceUrl,
            isApproved: t.isApproved,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to save topics.");
        return;
      }
      setTopics(data.topics as TopicRow[]);
    } finally {
      setSaving(false);
    }
  }

  const hasApproved = topics.some((t) => t.isApproved);

  function updateTopic(id: string, patch: Partial<TopicRow>) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading topics…
      </div>
    );
  }

  if (error && topics.length === 0 && !loading) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" className="w-fit" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {niche ? (
        <p className="text-sm text-muted-foreground">
          Niche: <span className="font-medium text-foreground">{niche}</span>
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
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
        <Button type="button" disabled={saving || topics.length === 0} onClick={() => void saveTopics()}>
          {saving ? "Saving…" : "Save changes"}
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
