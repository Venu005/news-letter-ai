"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createIssue } from "@/lib/mutation/issue-mutations";
import { newsletterDetailQueryKey } from "@/lib/query/newsletter-keys";

export function CreateArticleForm({ newsletterId }: { newsletterId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [niche, setNiche] = useState("");

  const mutation = useMutation({
    mutationFn: () => createIssue({ newsletterId, niche }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: newsletterDetailQueryKey(newsletterId),
      });
      router.push(
        `/dashboard/newsletter/${newsletterId}/issue/${data.issueId}/research`,
      );
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!niche.trim() || mutation.isPending) return;
    mutation.mutate();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="group/research relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6"
      aria-busy={mutation.isPending}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-secondary/15 blur-3xl transition-colors duration-500 group-hover/research:bg-secondary/25 dark:bg-secondary/10 dark:group-hover/research:bg-secondary/20"
      />
      <div className="relative flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div className="space-y-0.5">
          <h3
            className="text-lg tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-hero-display)" }}
          >
            Start a new issue
          </h3>
          <p className="text-sm text-muted-foreground">
            Define a niche and our agents will gather sources for you to review.
          </p>
        </div>
      </div>
      <div className="relative flex flex-col gap-1.5">
        <label
          htmlFor="issue-niche"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Niche or topic
        </label>
        <Textarea
          id="issue-niche"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. The future of renewable energy in Europe"
          required
          disabled={mutation.isPending}
          rows={3}
          className="resize-none text-base"
        />
      </div>
      {mutation.error ? (
        <Alert variant="destructive" className="relative">
          <AlertDescription>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Could not create issue."}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="relative flex flex-wrap items-center justify-end gap-3">
        <Button
          type="submit"
          disabled={!niche.trim() || mutation.isPending}
          className="cursor-pointer"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Researching
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden="true" />
              Start research
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
