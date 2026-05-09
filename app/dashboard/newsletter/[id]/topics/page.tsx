import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { TopicsEditor } from "./topics-editor";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getNewsletterDehydratedState } from "@/lib/query/prefetch-newsletter-detail";

function TopicsEditorFallback() {
  return (
    <div className="flex items-center gap-intel-stack-sm text-sm text-[#6F6F6F]">
      <Spinner />
      Loading topics…
    </div>
  );
}

export default async function TopicsPage({
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
          Topics
        </h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<TopicsEditorFallback />}>
          <TopicsEditor newsletterId={id} />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
