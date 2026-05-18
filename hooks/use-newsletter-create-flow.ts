"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createNewsletter } from "@/lib/mutation/newsletter-mutations";

export function useNewsletterCreateFlow() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;
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

  return { name, setName, loading, error, onSubmit };
}
