"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createNewsletter } from "@/lib/mutation/newsletter-mutations";

export function CreateNewsletterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const newsletter = await createNewsletter({ name });
      router.push(`/dashboard/newsletter/${newsletter.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create newsletter.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-intel-stack-md">
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-sm font-medium text-black">Newsletter name</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Coral Weekly"
          required
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={loading || !name.trim()}>
        {loading ? "Creating…" : "Create newsletter"}
      </Button>
    </form>
  );
}
