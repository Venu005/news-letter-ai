import {
  CheckCircle2,
  CircleDashed,
  FileEdit,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Status =
  | "RESEARCHING"
  | "DRAFTING"
  | "REVIEWING"
  | "PUBLISHED"
  | string;

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; className: string }
> = {
  RESEARCHING: {
    label: "Researching",
    icon: Search,
    className:
      "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/30",
  },
  DRAFTING: {
    label: "Drafting",
    icon: FileEdit,
    className:
      "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-400/30",
  },
  REVIEWING: {
    label: "Reviewing",
    icon: CircleDashed,
    className:
      "bg-violet-50 text-violet-900 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-400/30",
  },
  PUBLISHED: {
    label: "Published",
    icon: CheckCircle2,
    className:
      "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/30",
  },
};

export function IssueStatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    icon: CircleDashed,
    className:
      "bg-muted text-muted-foreground ring-border dark:bg-muted/40 dark:ring-border",
  };
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        config.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}
