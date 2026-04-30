"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";

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
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }

  if (loading) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading topics…</p>;
  }

  if (error && topics.length === 0 && !loading) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <Link href="/dashboard" className="text-sm font-medium text-red-900 underline dark:text-red-100">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {niche ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Niche: <span className="font-medium text-zinc-900 dark:text-zinc-100">{niche}</span>
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {topics.map((t) => (
          <article
            key={t.id}
            className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Title
              <input
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                value={t.title}
                onChange={(e) => updateTopic(t.id, { title: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Summary
              <textarea
                rows={3}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                value={t.summary}
                onChange={(e) => updateTopic(t.id, { summary: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Source URL
              <input
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                value={t.sourceUrl}
                onChange={(e) => updateTopic(t.id, { sourceUrl: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={t.isApproved}
                onChange={(e) => updateTopic(t.id, { isApproved: e.target.checked })}
              />
              Approved for newsletter
            </label>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || topics.length === 0}
          onClick={() => void saveTopics()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={!hasApproved}
          onClick={() => router.push(`/dashboard/newsletter/${newsletterId}/draft`)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100"
        >
          Continue to draft
        </button>
      </div>
      {!hasApproved ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Approve at least one topic to continue.
        </p>
      ) : null}
    </div>
  );
}
