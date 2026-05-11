import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { mastra } from "@/mastra/index";
import { requireInternalUserId } from "@/lib/current-user";
import { newsletterBelongsToUser } from "@/lib/newsletter-owner";
import { prisma } from "@/lib/prisma";
import { parseTopicsJson } from "@/mastra/lib/topics-json";

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

  const agent = mastra.getAgent("searchAgent");
  const memoryOpts = { thread: threadId, resource: issue.id } as const;

  const researchResult = await agent.generate(
    `Research niche: "${issue.niche}". Gather diverse stories, cite real URLs from tools, then emit ONLY the JSON topic array described in your instructions.`,
    { memory: memoryOpts, maxSteps: 24 },
  );

  const topicsPayload = parseTopicsJson(researchResult.text);

  await prisma.topic.createMany({
    data: topicsPayload.map((topic) => ({
      title: topic.title,
      summary: topic.summary,
      sourceUrl: topic.sourceUrl,
      issueId: issue.id,
      isApproved: true,
    })),
  });

  return NextResponse.json({ issueId: issue.id, threadId });
}
