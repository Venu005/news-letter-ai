import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubscribeForm } from "./subscribe-form";

export default async function PublicNewsletterPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const newsletter = await prisma.newsletter.findUnique({
    where: { slug },
    select: {
      slug: true,
      displayName: true,
      tagline: true,
      niche: true,
    },
  });
  if (!newsletter?.slug) notFound();

  const title = newsletter.displayName ?? newsletter.niche;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {newsletter.tagline ? (
          <p className="text-zinc-600 dark:text-zinc-400">{newsletter.tagline}</p>
        ) : null}
      </header>
      <SubscribeForm slug={newsletter.slug} />
    </main>
  );
}
