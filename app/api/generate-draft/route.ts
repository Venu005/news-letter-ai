import { NextResponse } from "next/server";
import { mastra } from "@/mastra/index";
import { requireInternalUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const authResult = await requireInternalUserId();
    if (!authResult.ok) return authResult.response;

    const body = (await req.json()) as { newsletterId?: string };
    const newsletterId = typeof body?.newsletterId === "string" ? body.newsletterId.trim() : "";

    if (!newsletterId) {
      return NextResponse.json({ error: "Missing newsletterId in request body." }, { status: 400 });
    }

    const newsletter = await prisma.newsletter.findFirst({
      where: { id: newsletterId, userId: authResult.userId },
      include: {
        topics: {
          where: { isApproved: true },
          orderBy: { title: "asc" },
        },
      },
    });

    if (!newsletter) {
      return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
    }

    if (!newsletter.topics.length) {
      return NextResponse.json({ error: "No approved topics available for this newsletter." }, { status: 400 });
    }

    await prisma.newsletter.update({
      where: { id: newsletter.id },
      data: { status: "DRAFTING" },
    });

    const outline = newsletter.topics
      .map(
        (topic, index) =>
          `${index + 1}. ${topic.title}\n   Summary: ${topic.summary}\n   Source: ${topic.sourceUrl}`,
      )
      .join("\n");

    const writer = mastra.getAgent("writerAgent");
    const editor = mastra.getAgent("editorAgent");

    const memoryOpts = {
      thread: newsletter.mastraThreadId,
      resource: newsletter.id,
    } as const;

    const writerResult = await writer.generate(
      `Approved newsletter outline:\n${outline}\n\nUsing ONLY prior research stored in this Mastra thread (plus this outline), draft the full Markdown newsletter with mandatory inline citations.`,
      {
        memory: memoryOpts,
        maxSteps: 30,
      },
    );

    const editorResult = await editor.generate(
      `Writer draft to supervise:\n\n${writerResult.text}`,
      {
        memory: memoryOpts,
        maxSteps: 20,
      },
    );

    await prisma.newsletter.update({
      where: { id: newsletter.id },
      data: {
        finalDraft: editorResult.text,
        status: "REVIEWING",
      },
    });

    return NextResponse.json({
      draft: editorResult.text,
    });
  } catch (error) {
    console.error("[generate-draft]", error);
    const message = error instanceof Error ? error.message : "Unexpected error generating draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
