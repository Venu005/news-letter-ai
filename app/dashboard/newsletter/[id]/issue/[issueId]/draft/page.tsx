import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { DraftEditor } from "./draft-editor";
import { IssueStepper } from "@/components/dashboard/issue-stepper";
import { getIssueDehydratedState } from "@/lib/query/prefetch-issue-detail";

function Fallback() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Loading draft…
    </div>
  );
}

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;
  const dehydratedState = await getIssueDehydratedState(issueId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-3">
        <Link
          href={`/dashboard/newsletter/${id}/issue/${issueId}/topics`}
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Back to topics
        </Link>
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step 2 of 3
          </span>
          <h1
            className="text-4xl tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-hero-display)", lineHeight: 1.05 }}
          >
            Write the draft.
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Generate a first pass from approved topics, edit in markdown, then
            publish when it&apos;s ready.
          </p>
        </div>
        <IssueStepper current="draft" newsletterId={id} issueId={issueId} />
      </div>
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<Fallback />}>
          <DraftEditor issueId={issueId} />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
