import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DraftEditor } from "./draft-editor";
import { OrchestraIssueShell } from "@/components/dashboard/orchestra-issue-shell";
import { getIssueDehydratedState } from "@/lib/query/prefetch-issue-detail";

function Fallback() {
  return (
    <div className="flex items-center gap-2 font-[family-name:var(--font-orch-body)] text-orch-body-sm text-[var(--intel-on-surface-variant)]">
      <Loader2 className="size-4 animate-spin" />
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
    <OrchestraIssueShell
      fullWidth
      className="bg-neutral-50/80 p-4 sm:p-6"
      crumbs={[
        { label: "New Newsletter", href: `/dashboard/newsletter/${id}` },
        { label: "Final Review" },
      ]}
    >
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<Fallback />}>
          <DraftEditor issueId={issueId} />
        </Suspense>
      </HydrationBoundary>
    </OrchestraIssueShell>
  );
}
