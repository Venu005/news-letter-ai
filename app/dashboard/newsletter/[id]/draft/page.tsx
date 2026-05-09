import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { DraftEditor } from "./draft-editor";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getNewsletterDehydratedState } from "@/lib/query/prefetch-newsletter-detail";

function DraftEditorFallback() {
  return (
    <div className="flex items-center gap-intel-stack-sm text-sm text-[#6F6F6F]">
      <Spinner />
      Loading…
    </div>
  );
}

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dehydratedState = await getNewsletterDehydratedState(id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-intel-stack-lg px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-intel-stack-md">
        <h1 className="orchestra-heading text-3xl font-normal tracking-tight text-black">
          Draft
        </h1>
        <div className="flex flex-wrap gap-intel-stack-sm">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/newsletter/${id}/topics`}>Back to topics</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<DraftEditorFallback />}>
          <DraftEditor newsletterId={id} />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
