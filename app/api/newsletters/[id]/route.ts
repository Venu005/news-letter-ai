import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import type { IssueStatus } from "@/lib/types/issue";

const patchNewsletterSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  tagline: z.string().trim().max(280).optional(),
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
      issues: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          newsletterId: true,
          niche: true,
          title: true,
          status: true,
          slug: true,
          publishedAt: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!newsletter) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  return NextResponse.json({
    newsletter: {
      id: newsletter.id,
      name: newsletter.name,
      slug: newsletter.slug,
      tagline: newsletter.tagline,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
    },
    issues: newsletter.issues.map((i) => ({
      id: i.id,
      newsletterId: i.newsletterId,
      niche: i.niche,
      title: i.title,
      status: i.status as IssueStatus,
      slug: i.slug,
      publishedAt: i.publishedAt ? i.publishedAt.toISOString() : null,
      updatedAt: i.updatedAt.toISOString(),
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
  if (body.name === undefined && body.tagline === undefined) {
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
      ...(body.name !== undefined && { name: body.name }),
      ...(body.tagline !== undefined && { tagline: body.tagline }),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    newsletter: {
      id: newsletter.id,
      name: newsletter.name,
      slug: newsletter.slug,
      tagline: newsletter.tagline,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
    },
  });
}
