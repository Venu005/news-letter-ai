import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeForm } from "@/app/home-form";
import { prisma } from "@/lib/prisma";
import { getInternalUserId } from "@/lib/current-user";

export default async function DashboardPage() {
  const internalId = await getInternalUserId();
  if (!internalId) redirect("/sign-in");

  const newsletters = await prisma.newsletter.findMany({
    where: { userId: internalId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, niche: true, slug: true, status: true, updatedAt: true },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-8 py-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your newsletters</h2>
        {newsletters.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No newsletters yet — create one below.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {newsletters.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{n.niche}</p>
                  <p className="text-xs text-zinc-500">
                    {n.slug ? `Public: /p/${n.slug}` : "Slug missing — run backfill"}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  <Link href={`/dashboard/newsletter/${n.id}/topics`} className="underline">
                    Edit
                  </Link>
                  {n.slug ? (
                    <Link href={`/p/${n.slug}`} className="underline" target="_blank" rel="noreferrer">
                      Public page
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Create newsletter</h2>
        <HomeForm topicsPathPrefix="/dashboard/newsletter" />
      </section>
    </main>
  );
}
