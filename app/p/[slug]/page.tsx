import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BookOpen, Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SubscribeForm } from "./subscribe-form";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PublicNewsletterPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const newsletter = await prisma.newsletter.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      tagline: true,
      issues: {
        where: { status: "PUBLISHED", slug: { not: null } },
        orderBy: { publishedAt: "desc" },
        select: { id: true, slug: true, title: true, niche: true, publishedAt: true },
      },
    },
  });
  if (!newsletter?.slug) notFound();

  const publishedIssues = newsletter.issues;

  return (
    <main
      className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-12 px-6 py-12 sm:px-8 sm:py-20"
      style={{ fontFamily: "var(--font-hero-body)" }}
    >
      <section className="flex flex-col gap-6 text-center">
        <span className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <Mail className="size-3" aria-hidden="true" />
          Newsletter
        </span>
        <h1
          className="text-5xl tracking-tight text-foreground sm:text-6xl"
          style={{ fontFamily: "var(--font-hero-display)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
        >
          {newsletter.name}
        </h1>
        {newsletter.tagline ? (
          <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
            {newsletter.tagline}
          </p>
        ) : null}
      </section>

      <section
        aria-label="Subscribe"
        className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7"
      >
        <div className="mb-4 flex flex-col gap-1 text-center">
          <h2
            className="text-xl tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-hero-display)" }}
          >
            Subscribe for new issues
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ll email a confirmation link. No spam, unsubscribe anytime.
          </p>
        </div>
        <SubscribeForm slug={newsletter.slug} />
      </section>

      {publishedIssues.length === 0 ? (
        <section className="mx-auto flex max-w-md flex-col items-center gap-2 text-center text-muted-foreground">
          <BookOpen className="size-6" aria-hidden="true" />
          <p className="text-sm">No issues published yet — check back soon.</p>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <header className="flex items-end justify-between gap-3 border-b border-border pb-2">
            <h2
              className="text-2xl tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-hero-display)" }}
            >
              Archive
            </h2>
            <span className="text-xs text-muted-foreground">
              {publishedIssues.length}{" "}
              {publishedIssues.length === 1 ? "issue" : "issues"}
            </span>
          </header>
          <ul className="flex flex-col">
            {publishedIssues.map((issue, idx) => (
              <li
                key={issue.id}
                className={
                  "group/article" + (idx > 0 ? " border-t border-border" : "")
                }
              >
                <Link
                  href={`/p/${newsletter.slug}/i/${issue.slug}`}
                  className="flex items-start justify-between gap-4 py-5 transition-colors duration-200 hover:bg-muted/40 -mx-2 px-2 rounded-md cursor-pointer"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    {issue.publishedAt ? (
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {formatDate(issue.publishedAt)}
                      </p>
                    ) : null}
                    <h3
                      className="text-lg font-medium tracking-tight text-foreground transition-colors duration-200 group-hover/article:text-foreground/90"
                      style={{ fontFamily: "var(--font-hero-display)" }}
                    >
                      {issue.title ?? issue.niche}
                    </h3>
                  </div>
                  <ArrowUpRight
                    className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-hover/article:text-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
