"use client";

import { useState } from "react";
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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-intel-stack-md">
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-foreground text-sm font-medium">Email</span>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
        />
      </div>
      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Submitting…" : "Subscribe"}
      </Button>
      {message ? (
        <Alert variant={status === "error" ? "destructive" : "default"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
