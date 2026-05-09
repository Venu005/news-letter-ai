"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-intel-stack-md">
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-sm font-medium text-black">Niche</span>
        <Input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. climate tech"
          required
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={loading || !niche.trim()}>
        {loading ? "Generating…" : "Generate topics"}
      </Button>
    </form>
  );
}
