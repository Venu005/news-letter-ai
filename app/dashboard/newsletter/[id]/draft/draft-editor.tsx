"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

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
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to generate draft.",
        );
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
        setError(
          typeof data.error === "string" ? data.error : "Failed to save draft.",
        );
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
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading…
      </div>
    );
  }

  if (notFound) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col gap-3">
          <span>Newsletter not found.</span>
          <Button variant="outline" size="sm" className="w-fit" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </span>
          <Badge variant="secondary">{status}</Badge>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {publishOk ? (
        <Alert>
          <AlertDescription>{publishOk}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={generating}
          onClick={() => void generateDraft()}
        >
          {generating ? "Generating…" : "Generate draft"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void saveDraft()}
        >
          {saving ? "Saving…" : "Save draft"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={publishing || generating || saving || !canPublish}
          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          onClick={() => void publishDraft()}
        >
          {publishing ? "Publishing…" : "Publish"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Markdown</span>
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
