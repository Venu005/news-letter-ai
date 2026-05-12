"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        `/dashboard/newsletter/${newsletterId}/issue/${data.issueId}/topics`,
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
      className="flex flex-col gap-intel-stack-md rounded-lg border border-black/10 p-6"
    >
      <h2 className="orchestra-heading text-xl font-normal text-black">
        Create an article
      </h2>
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-sm font-medium text-black">Niche</span>
        <Input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. climate tech this week"
          required
          disabled={mutation.isPending}
        />
      </div>
      {mutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Could not create article."}
          </AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={!niche.trim() || mutation.isPending}>
        {mutation.isPending ? "Researching…" : "Create article"}
      </Button>
    </form>
  );
}
