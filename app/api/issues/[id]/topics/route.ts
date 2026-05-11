import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { issueOwnedBy } from "@/lib/issue-owner";
import { prisma } from "@/lib/prisma";
import type { Topic } from "@/lib/types/topic";

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

function mapTopic(row: {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  isApproved: boolean;
  issueId: string;
}): Topic {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    sourceUrl: row.sourceUrl,
    isApproved: row.isApproved,
    issueId: row.issueId,
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const owner = await issueOwnedBy(id, authResult.userId);
  if (!owner) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const topics = await prisma.topic.findMany({
    where: { issueId: id },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ topics: topics.map(mapTopic) });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id: issueId } = await ctx.params;
  const owner = await issueOwnedBy(issueId, authResult.userId);
  if (!owner) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
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
    where: { issueId },
    select: { id: true },
  });
  const allowed = new Set(existing.map((t) => t.id));
  for (const row of parsed.data.topics) {
    if (!allowed.has(row.id)) {
      return NextResponse.json(
        { error: `Topic ${row.id} does not belong to this issue.` },
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
    where: { issueId },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({ topics: topics.map(mapTopic) });
}
