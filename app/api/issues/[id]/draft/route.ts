import { NextResponse } from "next/server";
import { mastra } from "@/mastra/index";
import { requireInternalUserId } from "@/lib/current-user";
import { issueOwnedBy } from "@/lib/issue-owner";
import { extractTitleFromMarkdown } from "@/lib/markdown-title";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireInternalUserId();
    if (!authResult.ok) return authResult.response;

    const { id } = await ctx.params;
    const owner = await issueOwnedBy(id, authResult.userId);
    if (!owner) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        topics: {
          where: { isApproved: true },
          orderBy: { title: "asc" },
        },
      },
    });
    if (!issue) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }
    if (!issue.topics.length) {
      return NextResponse.json(
        { error: "No approved topics available for this issue." },
        { status: 400 },
      );
    }

    await prisma.issue.update({
      where: { id },
      data: { status: "DRAFTING" },
    });

    const outline = issue.topics
      .map(
        (topic, index) =>
          `${index + 1}. ${topic.title}\n   Summary: ${topic.summary}\n   Source: ${topic.sourceUrl}`,
      )
      .join("\n");

    const writer = mastra.getAgent("writerAgent");
    const editor = mastra.getAgent("editorAgent");
    const memoryOpts = { thread: issue.mastraThreadId, resource: issue.id } as const;

    const writerResult = await writer.generate(
      `Approved article outline:\n${outline}\n\nUsing ONLY prior research stored in this Mastra thread (plus this outline), draft the full Markdown article with mandatory inline citations.`,
      { memory: memoryOpts, maxSteps: 30 },
    );

    const editorResult = await editor.generate(
      `Writer draft to supervise:\n\n${writerResult.text}`,
      { memory: memoryOpts, maxSteps: 20 },
    );

    const title = extractTitleFromMarkdown(editorResult.text, issue.niche) ?? issue.niche;

    await prisma.issue.update({
      where: { id },
      data: {
        finalDraft: editorResult.text,
        status: "REVIEWING",
        title,
      },
    });

    return NextResponse.json({ draft: editorResult.text, title });
  } catch (error) {
    console.error("[issues/draft]", error);
    const message =
      error instanceof Error ? error.message : "Unexpected error generating draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
