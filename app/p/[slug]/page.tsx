import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { SubscribeForm } from "./subscribe-form";

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
    <main className="mx-auto flex max-w-xl flex-col gap-intel-stack-lg px-intel-margin py-intel-stack-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-2xl">{newsletter.name}</CardTitle>
          {newsletter.tagline ? (
            <CardDescription>{newsletter.tagline}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <SubscribeForm slug={newsletter.slug} />
        </CardContent>
      </Card>

      {publishedIssues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues yet.</p>
      ) : (
        <section className="flex flex-col gap-intel-stack-md">
          <h2 className="orchestra-heading text-xl font-normal text-foreground">
            Published
          </h2>
          <ul className="flex flex-col gap-intel-stack-sm">
            {publishedIssues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/p/${newsletter.slug}/i/${issue.slug}`}
                  className="block rounded-md border border-black/10 p-4 hover:bg-black/[0.02]"
                >
                  <div className="text-base font-medium text-foreground">
                    {issue.title ?? issue.niche}
                  </div>
                  {issue.publishedAt ? (
                    <div className="text-xs text-muted-foreground">
                      {issue.publishedAt.toLocaleDateString()}
                    </div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
