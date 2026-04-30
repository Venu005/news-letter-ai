"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useState } from "react";

export function DraftEditor({ newsletterId }: { newsletterId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishOk, setPublishOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/newsletters/${newsletterId}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setNotFound(true);
        setStatus(null);
        setDraftText("");
        return;
      }
      if (!res.ok) {
        setError("Could not load newsletter.");
        return;
      }
      const nl = data.newsletter as {
        status?: string;
        finalDraft?: string | null;
      };
      setStatus(nl.status ?? null);
      setDraftText(nl.finalDraft ?? "");
    } finally {
      setLoading(false);
    }
  }, [newsletterId]);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  async function generateDraft() {
    setGenerating(true);
    setError(null);
    setPublishOk(null);
    try {
      const res = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to generate draft.");
        return;
      }
      const draft = typeof data.draft === "string" ? data.draft : "";
      setDraftText(draft);
      await load();
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    setSaving(true);
    setError(null);
    setPublishOk(null);
    try {
      const res = await fetch(`/api/newsletters/${newsletterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalDraft: draftText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to save draft.");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  const draftTrimmed = draftText.trim();
  const canPublish =
    draftTrimmed.length > 0 &&
    status !== "PUBLISHED" &&
    status !== "RESEARCHING" &&
    (status === "DRAFTING" || status === "REVIEWING");

  async function publishDraft() {
    setPublishing(true);
    setError(null);
    setPublishOk(null);
    try {
      const saveRes = await fetch(`/api/newsletters/${newsletterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalDraft: draftText }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        setError(
          typeof saveData.error === "string"
            ? saveData.error
            : "Could not save draft before publishing.",
        );
        return;
      }

      const pubRes = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterId }),
      });
      const pubData = await pubRes.json().catch(() => ({}));
      if (!pubRes.ok) {
        setError(
          typeof pubData.error === "string" ? pubData.error : "Publish failed.",
        );
        return;
      }
      setPublishOk("Published successfully.");
      await load();
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>;
  }

  if (notFound) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
        <p className="text-red-800 dark:text-red-200">Newsletter not found.</p>
        <Link href="/dashboard" className="text-sm font-medium text-red-900 underline dark:text-red-100">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status ? (
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Status:{" "}
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 font-normal normal-case text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
            {status}
          </span>
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {publishOk ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {publishOk}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={generating}
          onClick={() => void generateDraft()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {generating ? "Generating…" : "Generate draft"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveDraft()}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100"
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled={
            publishing ||
            generating ||
            saving ||
            !canPublish
          }
          onClick={() => void publishDraft()}
          className="rounded-md border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-800 disabled:opacity-50 dark:border-emerald-600 dark:text-emerald-300"
        >
          {publishing ? "Publishing…" : "Publish"}
        </button>
      </div>

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Markdown
        <textarea
          rows={18}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          spellCheck
        />
      </label>
    </div>
  );
}
