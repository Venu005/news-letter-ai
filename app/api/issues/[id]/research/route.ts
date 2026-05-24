import { NextResponse } from "next/server";
import { mastra } from "@/mastra/index";
import { requireInternalUserId } from "@/lib/current-user";
import { issueOwnedBy } from "@/lib/issue-owner";
import { prisma } from "@/lib/prisma";
import { parseTopicsJson } from "@/mastra/lib/topics-json";

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const owner = await issueOwnedBy(id, authResult.userId);
  if (!owner) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const issue = await prisma.issue.findUnique({
    where: { id },
    select: { id: true, niche: true, mastraThreadId: true, status: true },
  });
  if (!issue) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const signal = req.signal;

      const enqueue = (event: string, data: unknown) => {
        if (isClosed || signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        } catch {
          isClosed = true;
        }
      };

      try {
        const agent = mastra.getAgent("searchAgent");
        const memoryOpts = { thread: issue.mastraThreadId, resource: issue.id } as const;

        const streamResult = await agent.stream(
          `Research niche: "${issue.niche}". Gather diverse stories, cite real URLs from tools, then emit ONLY the JSON topic array described in your instructions.`,
          { memory: memoryOpts, maxSteps: 24 },
        );

        let accumulatedText = "";

        for await (const chunk of streamResult.fullStream as AsyncIterable<{
          type: string;
          payload: {
            toolName?: string;
            toolCallId?: string;
            args?: unknown;
            result?: unknown;
            text?: string;
            isError?: boolean;
          };
        }>) {
          if (isClosed || signal.aborted) break;

          if (chunk.type === "tool-call") {
            enqueue("step", {
              type: "tool-call",
              tool: chunk.payload.toolName,
              input: chunk.payload.args,
            });
          } else if (chunk.type === "tool-result") {
            enqueue("step", {
              type: "tool-result",
              tool: chunk.payload.toolName,
              output: chunk.payload.result,
            });
          } else if (chunk.type === "text-delta") {
            const text = chunk.payload.text ?? "";
            accumulatedText += text;
            enqueue("step", {
              type: "text",
              content: text,
            });
          }
        }

        const topicsPayload = parseTopicsJson(accumulatedText);

        await prisma.topic.createMany({
          data: topicsPayload.map((topic) => ({
            title: topic.title,
            sourceUrl: topic.sourceUrl,
            brief: topic.brief,
            keyFacts: JSON.stringify(topic.keyFacts),
            fullText: topic.fullText,
            issueId: issue.id,
            isApproved: true,
          })),
        });

        await prisma.issue.update({
          where: { id: issue.id },
          data: { status: "DRAFTING" },
        });

        enqueue("done", {
          issueId: issue.id,
          threadId: issue.mastraThreadId,
          topicCount: topicsPayload.length,
        });
      } catch (error) {
        if (!isClosed) {
          const message = error instanceof Error ? error.message : "Research failed";
          enqueue("error", { message });
        }
      } finally {
        if (!isClosed) {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }
    },
    cancel() {
      isClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
