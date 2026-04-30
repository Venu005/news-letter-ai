import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const topicRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  summary: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  isApproved: z.boolean().optional(),
});

const patchTopicsSchema = z.object({
  topics: z.array(topicRowSchema).min(1),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: newsletterId } = await ctx.params;

  const newsletterExists = await prisma.newsletter.findUnique({
    where: { id: newsletterId },
    select: { id: true },
  });
  if (!newsletterExists) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchTopicsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await prisma.topic.findMany({
    where: { newsletterId },
    select: { id: true },
  });
  const allowed = new Set(existing.map((t) => t.id));
  for (const row of parsed.data.topics) {
    if (!allowed.has(row.id)) {
      return NextResponse.json(
        { error: `Topic ${row.id} does not belong to this newsletter.` },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(
    parsed.data.topics.map((row) =>
      prisma.topic.update({
        where: { id: row.id },
        data: {
          ...(row.title !== undefined && { title: row.title }),
          ...(row.summary !== undefined && { summary: row.summary }),
          ...(row.sourceUrl !== undefined && { sourceUrl: row.sourceUrl }),
          ...(row.isApproved !== undefined && { isApproved: row.isApproved }),
        },
      }),
    ),
  );

  const topics = await prisma.topic.findMany({
    where: { newsletterId },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary,
      sourceUrl: t.sourceUrl,
      isApproved: t.isApproved,
      newsletterId: t.newsletterId,
    })),
  });
}
