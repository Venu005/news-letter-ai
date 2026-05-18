import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ChevronLeft, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateArticleForm } from "./create-article-form";
import { IssuesList } from "./issues-list";
import { NewsletterHeader } from "./newsletter-header";
import { getNewsletterDehydratedState } from "@/lib/query/prefetch-newsletter-detail";

function Fallback({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export default async function NewsletterIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dehydratedState = await getNewsletterDehydratedState(id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Newsletters
        </Link>
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Newsletter
          </span>
          <h1
            className="text-4xl tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-hero-display)", lineHeight: 1.05 }}
          >
            Edit publication
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Update your name and tagline, kick off a new issue, or jump back
            into one in progress.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="cursor-pointer">
            <a href="#new-issue">
              <Plus className="size-3.5" aria-hidden="true" />
              Start new issue
            </a>
          </Button>
        </div>
      </div>

      <HydrationBoundary state={dehydratedState}>
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Details
          </h2>
          <Suspense fallback={<Fallback label="Loading newsletter…" />}>
            <NewsletterHeader newsletterId={id} />
          </Suspense>
        </section>

        <section id="new-issue" className="flex scroll-mt-24 flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            New issue
          </h2>
          <Suspense fallback={null}>
            <CreateArticleForm newsletterId={id} />
          </Suspense>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Issues
          </h2>
          <Suspense fallback={<Fallback label="Loading issues…" />}>
            <IssuesList newsletterId={id} />
          </Suspense>
        </section>
      </HydrationBoundary>
    </div>
  );
}
