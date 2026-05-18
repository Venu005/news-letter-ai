import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  ExternalLink,
  FileText,
  Newspaper,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { CreateNewsletterForm } from "@/components/dashboard/create-newsletter-form";
import { FirstNewsletterDialog } from "@/components/dashboard/first-newsletter-dialog";
import { IssueStatusBadge } from "@/components/dashboard/issue-status-badge";
import { Button } from "@/components/ui/button";
import { needsFirstNewsletterOnboarding } from "@/lib/dashboard/first-newsletter-onboarding";
import { getInternalUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof FileText;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div
        className="text-3xl tracking-tight text-foreground"
        style={{ fontFamily: "var(--font-hero-display)" }}
      >
        {value}
      </div>
      {hint ? (
        <div className="text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

function relativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const day = 86_400_000;
  if (diffMs < day) return "today";
  if (diffMs < day * 2) return "yesterday";
  if (diffMs < day * 30) return `${Math.floor(diffMs / day)} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  const internalId = await getInternalUserId();
  if (!internalId) redirect("/sign-in");

  const newsletters = await prisma.newsletter.findMany({
    where: { userId: internalId },
    orderBy: { updatedAt: "desc" },
    include: {
      issues: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, publishedAt: true, createdAt: true },
        take: 1,
      },
      _count: { select: { issues: true } },
    },
  });

  const totalIssues = newsletters.reduce((sum, n) => sum + n._count.issues, 0);
  const publishedCount = newsletters.reduce(
    (sum, n) =>
      sum + n.issues.filter((i) => i.status === "PUBLISHED").length,
    0,
  );

  const onboarding = needsFirstNewsletterOnboarding(newsletters.length);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 sm:px-8 sm:py-14">
      <FirstNewsletterDialog defaultOpen={onboarding} />
      <section className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3" aria-hidden="true" />
          Studio
        </span>
        <h1
          className="text-4xl tracking-tight text-foreground sm:text-5xl"
          style={{ fontFamily: "var(--font-hero-display)", lineHeight: 1.05 }}
        >
          Your newsletters.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Curate niches, gather sources, and ship issues your readers actually
          finish. Pick up where you left off, or start something new.
        </p>
      </section>

      <section
        aria-label="Overview"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <StatCard
          label="Newsletters"
          value={newsletters.length}
          hint={newsletters.length === 1 ? "1 publication" : "publications"}
          icon={Newspaper}
        />
        <StatCard
          label="Issues"
          value={totalIssues}
          hint="across all newsletters"
          icon={FileText}
        />
        <StatCard
          label="Published"
          value={publishedCount}
          hint={publishedCount === 0 ? "nothing live yet" : "live editions"}
          icon={Send}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              className="text-2xl tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-hero-display)" }}
            >
              All publications
            </h2>
            <p className="text-sm text-muted-foreground">
              {newsletters.length === 0
                ? "Create your first newsletter to get started."
                : `${newsletters.length} ${
                    newsletters.length === 1 ? "newsletter" : "newsletters"
                  } · sorted by recent activity`}
            </p>
          </div>
          {newsletters.length > 0 ? (
            <Button asChild size="sm" className="cursor-pointer">
              <a href="#create-newsletter">
                <Plus className="size-3.5" aria-hidden="true" />
                New newsletter
              </a>
            </Button>
          ) : null}
        </div>

        {newsletters.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/50 p-8 sm:p-10">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Newspaper className="size-6" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h3
                className="text-xl tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-hero-display)" }}
              >
                No newsletters yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Spin up your first publication below. You can change the name
                and tagline any time.
              </p>
            </div>
            <Button asChild className="cursor-pointer">
              <a href="#create-newsletter">
                <Plus className="size-3.5" aria-hidden="true" />
                Create newsletter
              </a>
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {newsletters.map((n) => {
              const latest = n.issues[0];
              const issueCount = n._count.issues;
              const meta = latest
                ? latest.status === "PUBLISHED" && latest.publishedAt
                  ? `Last published ${relativeDate(latest.publishedAt)}`
                  : `Last updated ${relativeDate(latest.createdAt)}`
                : "No issues yet";

              return (
                <li
                  key={n.id}
                  className="group/card relative flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground transition-colors duration-200 focus-within:border-foreground/30 hover:border-foreground/30 hover:bg-muted/40"
                >
                  <Link
                    href={`/dashboard/newsletter/${n.id}`}
                    aria-label={`Open ${n.name}`}
                    className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3
                        className="truncate text-lg font-medium tracking-tight text-foreground"
                        style={{ fontFamily: "var(--font-hero-display)" }}
                      >
                        {n.name}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {n.slug ? `orchestra.app/p/${n.slug}` : "Slug pending"}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-hover/card:text-foreground"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="relative flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                      <FileText className="size-3" aria-hidden="true" />
                      {issueCount} {issueCount === 1 ? "issue" : "issues"}
                    </span>
                    {latest ? (
                      <IssueStatusBadge status={latest.status} />
                    ) : null}
                    <span className="ml-auto text-[11px] text-muted-foreground/80">
                      {meta}
                    </span>
                  </div>

                  {n.slug ? (
                    <div className="relative flex items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs">
                      <span className="text-muted-foreground">Open studio</span>
                      <Link
                        href={`/p/${n.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="relative inline-flex items-center gap-1 text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
                      >
                        Public page
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </Link>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        id="create-newsletter"
        className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 sm:p-8"
      >
        <div className="mb-6 flex flex-col gap-1">
          <h2
            className="text-2xl tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-hero-display)" }}
          >
            Start a new newsletter
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ll generate a slug and a public landing page for subscribers.
          </p>
        </div>
        <CreateNewsletterForm />
      </section>
    </div>
  );
}
