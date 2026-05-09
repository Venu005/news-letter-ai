import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeForm } from "@/app/home-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getInternalUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const internalId = await getInternalUserId();
  if (!internalId) redirect("/sign-in");

  const newsletters = await prisma.newsletter.findMany({
    where: { userId: internalId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, niche: true, slug: true, status: true, updatedAt: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-intel-stack-lg px-8 py-10">
      <section className="space-y-intel-stack-md">
        <h2 className="orchestra-heading text-2xl font-normal tracking-tight text-black">
          Your newsletters
        </h2>
        {newsletters.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[#6F6F6F]">
                No newsletters yet — create one below.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-intel-stack-md">
            {newsletters.map((n) => (
              <Card key={n.id} size="sm">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-intel-stack-md space-y-0">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-base font-medium text-black">
                      {n.niche}
                    </CardTitle>
                    <CardDescription className="text-[#6F6F6F]">
                      {n.slug ? `Public: /p/${n.slug}` : "Slug missing — run backfill"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{n.status}</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-intel-stack-sm pt-0">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/newsletter/${n.id}/topics`}>Edit</Link>
                  </Button>
                  {n.slug ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/p/${n.slug}`} target="_blank" rel="noreferrer">
                        Public page
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator className="bg-black/10" />

      <section className="space-y-intel-stack-md">
        <h2 className="orchestra-heading text-2xl font-normal tracking-tight text-black">
          Create newsletter
        </h2>
        <HomeForm topicsPathPrefix="/dashboard/newsletter" />
      </section>
    </main>
  );
}
