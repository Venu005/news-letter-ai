"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
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
    <section className="flex flex-col gap-intel-stack-md rounded-lg border border-black/10 p-6">
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Name
        </span>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tagline (optional)
        </span>
        <Textarea
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
      <Button
        type="button"
        disabled={!dirty || saveMutation.isPending || name.trim().length === 0}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? "Saving…" : "Save"}
      </Button>
    </section>
  );
}
