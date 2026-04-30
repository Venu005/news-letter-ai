"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function HomeForm({
  topicsPathPrefix = "/dashboard/newsletter",
}: {
  /** Path prefix before `/[newsletterId]/topics` */
  topicsPathPrefix?: string;
}) {
  const router = useRouter();
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        newsletterId?: string;
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to generate topics.");
        return;
      }
      if (!data.newsletterId) {
        setError("Missing newsletter id in response.");
        return;
      }
      router.push(`${topicsPathPrefix}/${data.newsletterId}/topics`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
        Niche
        <input
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-950"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. climate tech"
          required
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading || !niche.trim()}
        className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Generating…" : "Generate topics"}
      </button>
    </form>
  );
}
