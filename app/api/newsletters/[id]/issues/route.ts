import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { newsletterBelongsToUser } from "@/lib/newsletter-owner";
import { prisma } from "@/lib/prisma";

const createIssueSchema = z.object({
  niche: z.string().trim().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id: newsletterId } = await ctx.params;
  const ok = await newsletterBelongsToUser(newsletterId, authResult.userId);
  if (!ok) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createIssueSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const threadId = randomUUID();

  const issue = await prisma.issue.create({
    data: {
      newsletterId,
      niche: parsed.data.niche,
      mastraThreadId: threadId,
      status: "RESEARCHING",
    },
    select: { id: true, niche: true, mastraThreadId: true },
  });

  return NextResponse.json({ issueId: issue.id, threadId });
}
