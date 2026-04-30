import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mastra } from "@/mastra/index";
import { prisma } from "@/lib/prisma";
import { parseTopicsJson } from "@/mastra/lib/topics-json";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { niche?: string };
    const niche = typeof body?.niche === "string" ? body.niche.trim() : "";

    if (!niche) {
      return NextResponse.json({ error: "Missing niche in request body." }, { status: 400 });
    }

    const threadId = randomUUID();

    const newsletter = await prisma.newsletter.create({
      data: {
        niche,
        mastraThreadId: threadId,
      },
    });

    const agent = mastra.getAgent("searchAgent");
    const memoryOpts = {
      thread: threadId,
      resource: newsletter.id,
    } as const;

    const researchResult = await agent.generate(
      `Research niche: "${niche}". Gather diverse stories, cite real URLs from tools, then emit ONLY the JSON topic array described in your instructions.`,
      {
        memory: memoryOpts,
        maxSteps: 24,
      },
    );

    const topicsPayload = parseTopicsJson(researchResult.text);

    await prisma.topic.createMany({
      data: topicsPayload.map((topic) => ({
        title: topic.title,
        summary: topic.summary,
        sourceUrl: topic.sourceUrl,
        newsletterId: newsletter.id,
        isApproved: true,
      })),
    });

    const topics = await prisma.topic.findMany({
      where: { newsletterId: newsletter.id },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({
      newsletterId: newsletter.id,
      threadId,
      topics,
    });
  } catch (error) {
    console.error("[generate-topics]", error);
    const message = error instanceof Error ? error.message : "Unexpected error generating topics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
