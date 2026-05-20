"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateNewsletterMetadata } from "@/lib/mutation/newsletter-mutations";
import { fetchNewsletterDetail } from "@/lib/query/fetch-newsletter-detail";
import { newsletterDetailQueryKey } from "@/lib/query/newsletter-keys";

export function NewsletterHeader({ newsletterId }: { newsletterId: string }) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: newsletterDetailQueryKey(newsletterId),
    queryFn: ({ signal }) => fetchNewsletterDetail(newsletterId, { signal }),
  });

  const [name, setName] = useState(data.newsletter.name);
  const [tagline, setTagline] = useState(data.newsletter.tagline ?? "");

  const saveMutation = useMutation({
    mutationFn: () =>
      updateNewsletterMetadata({
        id: newsletterId,
        name: name.trim(),
        tagline: tagline.trim(),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: newsletterDetailQueryKey(newsletterId),
      }),
  });

  const dirty =
    name.trim() !== data.newsletter.name ||
    tagline.trim() !== (data.newsletter.tagline ?? "");

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="newsletter-edit-name"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Name
        </label>
        <Input
          id="newsletter-edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="newsletter-edit-tagline"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Tagline{" "}
          <span className="font-normal normal-case text-muted-foreground/70">
            · optional, shown on the public page
          </span>
        </label>
        <Textarea
          id="newsletter-edit-tagline"
          rows={2}
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />
      </div>
      {saveMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Save failed."}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {!dirty && !saveMutation.isPending && saveMutation.isSuccess ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
            Saved
          </span>
        ) : null}
        <Button
          type="button"
          disabled={!dirty || saveMutation.isPending || name.trim().length === 0}
          onClick={() => saveMutation.mutate()}
          className="cursor-pointer"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden="true" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
