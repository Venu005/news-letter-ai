import { prisma } from "@/lib/prisma";

/** Returns true when this newsletter exists and is owned by the internal user. */
export async function newsletterBelongsToUser(
  newsletterId: string,
  internalUserId: string,
): Promise<boolean> {
  const row = await prisma.newsletter.findFirst({
    where: { id: newsletterId, userId: internalUserId },
    select: { id: true },
  });
  return !!row;
}
