import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ResearchStream } from "./research-stream";
import { IssueStepper } from "@/components/dashboard/issue-stepper";

export default async function ResearchPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-3">
        <Link
          href={`/dashboard/newsletter/${id}`}
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Back to newsletter
        </Link>
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step 1 of 4
          </span>
          <h1
            className="text-4xl tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-hero-display)", lineHeight: 1.05 }}
          >
            Research in progress.
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            The agent is searching for articles, scraping content, and analyzing
            sources. Watch the process unfold below.
          </p>
        </div>
        <IssueStepper current="research" newsletterId={id} issueId={issueId} />
      </div>
      <ResearchStream issueId={issueId} newsletterId={id} />
    </div>
  );
}
