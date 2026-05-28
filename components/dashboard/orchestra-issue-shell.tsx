import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

export function OrchestraIssueShell({
  crumbs,
  children,
  className,
  fullWidth = false,
}: {
  crumbs: Crumb[];
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <main
      className={cn(
        "flex-1 overflow-y-auto bg-[var(--intel-surface)] p-6 sm:p-8",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto w-full",
          fullWidth ? "max-w-none" : "max-w-[var(--max-width-intel-container)]",
        )}
      >
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 font-[family-name:var(--font-orch-body)] text-orch-body-sm text-[var(--intel-on-surface-variant)]"
        >
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <span key={`${crumb.label}-${idx}`} className="flex items-center gap-2">
                {idx > 0 ? (
                  <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
                ) : null}
                {isLast || !crumb.href ? (
                  <span className="font-medium text-[var(--intel-on-surface)]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-[var(--intel-on-surface)]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
        {children}
      </div>
    </main>
  );
}
