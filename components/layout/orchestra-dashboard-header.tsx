"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell, Loader2, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIssueWorkflowActions } from "@/components/dashboard/issue-workflow-actions";
import { cn } from "@/lib/utils";

const TOP_NAV = [
  { label: "Drafts", href: "/dashboard" },
  { label: "Templates", href: "/dashboard" },
  { label: "Archive", href: "/dashboard" },
] as const;

export function OrchestraDashboardHeader() {
  const pathname = usePathname() ?? "/dashboard";
  const workflow = useIssueWorkflowActions();
  const onDraftPage = /\/issue\/[^/]+\/draft/.test(pathname);

  return (
    <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between gap-4 border-b border-[var(--intel-surface-container-high)] bg-[var(--intel-surface-container-lowest)]/80 px-4 py-3 backdrop-blur-md sm:px-8">
      <div className="flex min-w-0 items-center gap-4 sm:gap-8">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <h1 className="truncate font-[family-name:var(--font-orch-heading)] text-xl font-black tracking-tight text-[var(--intel-on-surface)]">
          Newsletter Orchestrator
        </h1>
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--intel-on-surface-variant)]" />
          <input
            type="search"
            placeholder="Search..."
            className="w-64 rounded-full border border-[var(--intel-surface-container-high)] bg-[var(--intel-surface)] py-1.5 pl-9 pr-4 font-[family-name:var(--font-orch-body)] text-orch-body-sm outline-none transition-colors focus:border-[var(--intel-secondary)] focus:ring-1 focus:ring-[var(--intel-secondary)]/50"
          />
        </div>
      </div>

      <nav className="hidden items-center gap-6 md:flex">
        {TOP_NAV.map((item, idx) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "pb-0.5 font-[family-name:var(--font-orch-body)] text-orch-label-md transition-colors",
              idx === 0
                ? "border-b-2 border-[var(--intel-on-surface)] text-[var(--intel-on-surface)]"
                : "text-[var(--intel-on-surface-variant)] hover:text-[var(--intel-secondary)]",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2 sm:gap-4">
        {onDraftPage && workflow ? (
          <>
            <button
              type="button"
              disabled={workflow.saveDisabled || workflow.savePending}
              onClick={workflow.onSave}
              className="hidden rounded border border-[var(--intel-surface-container-high)] px-4 py-2 font-[family-name:var(--font-orch-body)] text-orch-label-md text-[var(--intel-on-surface)] transition-colors hover:bg-[var(--intel-surface-container-low)] disabled:opacity-50 sm:block"
            >
              {workflow.savePending ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              disabled={workflow.publishDisabled || workflow.publishPending}
              onClick={workflow.onPublish}
              className="flex items-center gap-2 rounded bg-[var(--intel-primary)] px-4 py-2 font-[family-name:var(--font-orch-body)] text-orch-label-md text-[var(--intel-on-primary)] transition-colors hover:bg-[var(--intel-primary)]/90 disabled:opacity-50"
            >
              {workflow.publishPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Publish
            </button>
            <span className="mx-1 hidden h-6 w-px bg-[var(--intel-surface-container-high)] sm:block" />
          </>
        ) : null}
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full text-[var(--intel-on-surface-variant)] transition-colors hover:bg-[var(--intel-surface-container-low)]"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
        </button>
        <UserButton />
      </div>
    </header>
  );
}
