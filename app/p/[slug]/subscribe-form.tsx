"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SubscribeForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/public/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      setStatus("done");
      setMessage(typeof data.message === "string" ? data.message : "Check your email.");
    } catch {
      setStatus("error");
      setMessage("Network error.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-400/30 dark:bg-emerald-500/10">
        <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Almost there
          </p>
          <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80">
            {message ?? "Check your email to confirm."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3"
      aria-busy={status === "loading"}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={`subscribe-${slug}`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status === "loading"}
            className="h-11 pl-9"
            aria-label="Email"
          />
        </div>
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-11 cursor-pointer"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Submitting
            </>
          ) : (
            "Subscribe"
          )}
        </Button>
      </div>
      {status === "error" && message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
