import { prisma } from "@/lib/prisma";

/** Idempotent: create or update internal User keyed by Clerk `userId`. */
export async function upsertUserByClerkId(
  clerkUserId: string,
  email: string | null,
) {
  return prisma.user.upsert({
    where: { clerkUserId },
    create: { clerkUserId, email },
    update: email ? { email } : {},
    select: { id: true },
  });
}
