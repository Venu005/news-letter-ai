import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, timingSafeEqualHex } from "@/lib/subscribe-token";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const fail = NextResponse.redirect(new URL("/subscribe/error", req.url));
  const ok = NextResponse.redirect(new URL("/subscribe/success", req.url));

  if (!token.trim()) return fail;

  const tokenHash = hashToken(token);

  const match = await prisma.subscriber.findFirst({
    where: { confirmationTokenHash: tokenHash },
    select: {
      id: true,
      status: true,
      confirmationExpiresAt: true,
      confirmationTokenHash: true,
    },
  });

  if (!match?.confirmationTokenHash) return fail;

  if (!timingSafeEqualHex(match.confirmationTokenHash, tokenHash)) return fail;

  if (match.status === "active") return ok;

  if (match.status !== "pending") return fail;

  if (!match.confirmationExpiresAt || match.confirmationExpiresAt.getTime() < Date.now()) {
    return fail;
  }

  await prisma.subscriber.update({
    where: { id: match.id },
    data: {
      status: "active",
      confirmedAt: new Date(),
      confirmationTokenHash: null,
      confirmationExpiresAt: null,
    },
  });

  return ok;
}
