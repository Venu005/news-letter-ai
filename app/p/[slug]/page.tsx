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
    <main className="mx-auto flex max-w-xl flex-col gap-intel-stack-lg px-intel-margin py-intel-stack-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-2xl">{title}</CardTitle>
          {newsletter.tagline ? <CardDescription>{newsletter.tagline}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <SubscribeForm slug={newsletter.slug} />
        </CardContent>
      </Card>
    </main>
  );
}
