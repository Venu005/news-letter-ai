import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  clientIpFromHeaders,
  rateLimitSubscribeHit,
  subscribeRateKeys,
} from "@/lib/rate-limit-subscribe";
import { confirmationLink, sendSubscribeConfirmationEmail } from "@/lib/subscribe-email";
import { hashToken, randomUrlToken } from "@/lib/subscribe-token";

const bodySchema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
});

const CONFIRM_HOURS = 48;

const GENERIC = {
  message:
    "If this address can receive mail, we sent a confirmation link. Please check your inbox.",
};

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or slug." }, { status: 400 });
  }

  const slug = parsed.data.slug.trim();
  const emailNormalized = parsed.data.email.trim().toLowerCase();

  const newsletter = await prisma.newsletter.findUnique({
    where: { slug },
    select: { id: true, displayName: true, niche: true },
  });

  if (!newsletter) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  const ip = clientIpFromHeaders(req.headers);
  const keys = subscribeRateKeys(ip, slug, emailNormalized);
  if (!rateLimitSubscribeHit(keys.ipSlug, "ipSlug") || !rateLimitSubscribeHit(keys.ipEmailSlug, "ipEmailSlug")) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const existing = await prisma.subscriber.findUnique({
    where: {
      newsletterId_emailNormalized: {
        newsletterId: newsletter.id,
        emailNormalized,
      },
    },
    select: { status: true },
  });

  if (existing?.status === "active") {
    return NextResponse.json(GENERIC);
  }

  const plainToken = randomUrlToken();
  const tokenHash = hashToken(plainToken);
  const confirmationExpiresAt = new Date(Date.now() + CONFIRM_HOURS * 60 * 60 * 1000);

  await prisma.subscriber.upsert({
    where: {
      newsletterId_emailNormalized: {
        newsletterId: newsletter.id,
        emailNormalized,
      },
    },
    create: {
      newsletterId: newsletter.id,
      emailNormalized,
      status: "pending",
      confirmationTokenHash: tokenHash,
      confirmationExpiresAt,
    },
    update: {
      status: "pending",
      confirmationTokenHash: tokenHash,
      confirmationExpiresAt,
      confirmedAt: null,
    },
  });

  let confirmUrl: string;
  try {
    confirmUrl = confirmationLink(plainToken);
  } catch {
    console.error("[subscribe] APP_URL missing");
    return NextResponse.json({ error: "Subscribe is not configured on this server." }, { status: 503 });
  }

  const title = newsletter.displayName ?? newsletter.niche;
  const sent = await sendSubscribeConfirmationEmail({
    to: parsed.data.email.trim(),
    newsletterTitle: title,
    confirmUrl,
  });

  if (!sent) {
    console.error("[subscribe] confirmation email failed");
  }

  return NextResponse.json(GENERIC);
}
