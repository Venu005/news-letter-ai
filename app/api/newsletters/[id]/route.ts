import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchNewsletterSchema = z.object({
  finalDraft: z.string(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
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
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchNewsletterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const exists = await prisma.newsletter.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  const newsletter = await prisma.newsletter.update({
    where: { id },
    data: { finalDraft: parsed.data.finalDraft },
  });

  return NextResponse.json({
    newsletter: {
      id: newsletter.id,
      niche: newsletter.niche,
      mastraThreadId: newsletter.mastraThreadId,
      status: newsletter.status,
      finalDraft: newsletter.finalDraft,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
    },
  });
}
