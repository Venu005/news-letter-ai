"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NewsletterNotFoundError } from "@/lib/query/fetch-newsletter-detail";

export default function TopicsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[topics]", error);
  }, [error]);

  const is404 = error instanceof NewsletterNotFoundError;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col gap-3">
          <span>
            {is404
              ? error.message
              : "Something went wrong loading this newsletter."}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => reset()}>
              Try again
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
