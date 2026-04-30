import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const patchNewsletterSchema = z.object({
  finalDraft: z.string().optional(),
  displayName: z.string().max(120).optional(),
  tagline: z.string().max(280).optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const newsletter = await prisma.newsletter.findFirst({
    where: { id, userId: authResult.userId },
    include: {
      topics: { orderBy: { title: "asc" } },
    },
  });
  if (!newsletter) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }
  return NextResponse.json({
    newsletter: {
      id: newsletter.id,
      niche: newsletter.niche,
      mastraThreadId: newsletter.mastraThreadId,
      status: newsletter.status,
      finalDraft: newsletter.finalDraft,
      slug: newsletter.slug,
      displayName: newsletter.displayName,
      tagline: newsletter.tagline,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
    },
    topics: newsletter.topics.map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary,
      sourceUrl: t.sourceUrl,
      isApproved: t.isApproved,
      newsletterId: t.newsletterId,
    })),
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchNewsletterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const body = parsed.data;
  if (
    body.finalDraft === undefined &&
    body.displayName === undefined &&
    body.tagline === undefined
  ) {
    return NextResponse.json({ error: "At least one field required." }, { status: 400 });
  }

  const owned = await prisma.newsletter.findFirst({
    where: { id, userId: authResult.userId },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  const newsletter = await prisma.newsletter.update({
    where: { id },
    data: {
      ...(body.finalDraft !== undefined && { finalDraft: body.finalDraft }),
      ...(body.displayName !== undefined && { displayName: body.displayName }),
      ...(body.tagline !== undefined && { tagline: body.tagline }),
    },
  });

  return NextResponse.json({
    newsletter: {
      id: newsletter.id,
      niche: newsletter.niche,
      mastraThreadId: newsletter.mastraThreadId,
      status: newsletter.status,
      finalDraft: newsletter.finalDraft,
      slug: newsletter.slug,
      displayName: newsletter.displayName,
      tagline: newsletter.tagline,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
    },
  });
}
