import Link from "next/link";
import { Check, Lightbulb, FileText, Send, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "research" | "topics" | "draft" | "publish";

const STEPS: { id: Step; label: string; description: string; icon: typeof Check }[] = [
  { id: "research", label: "Research", description: "Agent gathers", icon: Search },
  { id: "topics", label: "Topics", description: "Curate sources", icon: Lightbulb },
  { id: "draft", label: "Draft", description: "Edit copy", icon: FileText },
  { id: "publish", label: "Publish", description: "Send to readers", icon: Send },
];

export function IssueStepper({
  current,
  newsletterId,
  issueId,
}: {
  current: Step;
  newsletterId: string;
  issueId: string;
}) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Issue progress" className="w-full">
      <ol className="flex w-full items-center gap-2 sm:gap-3">
        {STEPS.map((step, index) => {
          const status: "complete" | "current" | "upcoming" =
            index < currentIndex
              ? "complete"
              : index === currentIndex
                ? "current"
                : "upcoming";
          const Icon = step.icon;

          const href =
            step.id === "publish"
              ? `/dashboard/newsletter/${newsletterId}/issue/${issueId}/draft`
              : `/dashboard/newsletter/${newsletterId}/issue/${issueId}/${step.id}`;

          const content = (
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-200",
                  status === "complete" &&
                    "bg-foreground text-background ring-foreground",
                  status === "current" &&
                    "bg-background text-foreground ring-foreground",
                  status === "upcoming" &&
                    "bg-background text-muted-foreground ring-border",
                )}
              >
                {status === "complete" ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  <Icon className="size-3.5" aria-hidden="true" />
                )}
              </span>
              <span className="hidden flex-col leading-tight sm:flex">
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    status === "upcoming"
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {step.description}
                </span>
              </span>
            </span>
          );

          const interactive = status === "complete" || status === "current";

          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              {interactive && step.id !== "publish" ? (
                <Link
                  href={href}
                  aria-current={status === "current" ? "step" : undefined}
                  className="group/step inline-flex min-w-0 items-center gap-2 rounded-md p-1 transition-colors duration-200 hover:bg-muted/60 cursor-pointer"
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-current={status === "current" ? "step" : undefined}
                  className="inline-flex min-w-0 items-center gap-2 rounded-md p-1"
                >
                  {content}
                </span>
              )}
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-px flex-1 transition-colors duration-200",
                    index < currentIndex ? "bg-foreground/40" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
