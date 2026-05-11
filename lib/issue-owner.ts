import { prisma } from "@/lib/prisma";

/**
 * Returns the issue's `newsletterId` when this issue exists and the parent
 * newsletter belongs to `internalUserId`; otherwise returns `null`.
 *
 * Callers use the returned newsletterId to load related data (subscribers,
 * newsletter name for email subjects, etc.) without a second query.
 */
export async function issueOwnedBy(
  issueId: string,
  internalUserId: string,
): Promise<{ newsletterId: string } | null> {
  const row = await prisma.issue.findFirst({
    where: { id: issueId, newsletter: { userId: internalUserId } },
    select: { newsletterId: true },
  });
  return row ? { newsletterId: row.newsletterId } : null;
}
