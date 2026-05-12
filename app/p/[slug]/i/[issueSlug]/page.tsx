import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { SubscribeForm } from "../../subscribe-form";
import { IssueMarkdown } from "./issue-markdown";

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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-intel-stack-lg px-intel-margin py-intel-stack-lg">
      <div className="flex flex-wrap items-center justify-between gap-intel-stack-sm">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/p/${newsletter.slug}`}>← {newsletter.name}</Link>
        </Button>
        {issue.publishedAt ? (
          <span className="text-xs text-muted-foreground">
            Published {issue.publishedAt.toLocaleDateString()}
          </span>
        ) : null}
      </div>

      <header className="space-y-intel-stack-sm">
        <h1 className="orchestra-heading text-3xl font-normal text-foreground">
          {title}
        </h1>
      </header>

      <IssueMarkdown source={issue.finalDraft} />

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-lg">
            Subscribe to {newsletter.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubscribeForm slug={newsletter.slug} />
        </CardContent>
      </Card>
    </main>
  );
}
