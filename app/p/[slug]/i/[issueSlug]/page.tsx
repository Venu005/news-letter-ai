import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SubscribeForm } from "../../subscribe-form";
import { IssueMarkdown } from "./issue-markdown";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function readingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export default async function PublicIssuePage(props: {
  params: Promise<{ slug: string; issueSlug: string }>;
}) {
  const { slug, issueSlug } = await props.params;

  const newsletter = await prisma.newsletter.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      tagline: true,
    },
  });
  if (!newsletter?.slug) notFound();

  const issue = await prisma.issue.findFirst({
    where: {
      newsletter: { slug },
      slug: issueSlug,
      status: "PUBLISHED",
    },
    select: {
      title: true,
      niche: true,
      finalDraft: true,
      publishedAt: true,
    },
  });
  if (!issue || !issue.finalDraft) notFound();

  const title = issue.title ?? issue.niche;
  const minutes = readingTime(issue.finalDraft);

  return (
    <main
      className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-10 sm:px-8 sm:py-16"
      style={{ fontFamily: "var(--font-hero-body)" }}
    >
      <Link
        href={`/p/${newsletter.slug}`}
        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
      >
        <ChevronLeft className="size-3.5" aria-hidden="true" />
        {newsletter.name}
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {issue.publishedAt ? (
            <time dateTime={issue.publishedAt.toISOString()}>
              {formatDate(issue.publishedAt)}
            </time>
          ) : null}
          <span aria-hidden="true">·</span>
          <span>{minutes} min read</span>
        </div>
        <h1
          className="text-4xl tracking-tight text-foreground sm:text-5xl"
          style={{
            fontFamily: "var(--font-hero-display)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
      </header>

      <IssueMarkdown source={issue.finalDraft} />

      <section
        aria-label="Subscribe"
        className="mt-4 rounded-2xl border border-border bg-card p-6"
      >
        <div className="mb-4 space-y-1">
          <h2
            className="text-xl tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-hero-display)" }}
          >
            Enjoyed this? Subscribe to {newsletter.name}.
          </h2>
          <p className="text-sm text-muted-foreground">
            Get the next issue in your inbox. No spam, unsubscribe anytime.
          </p>
        </div>
        <SubscribeForm slug={newsletter.slug} />
      </section>
    </main>
  );
}
