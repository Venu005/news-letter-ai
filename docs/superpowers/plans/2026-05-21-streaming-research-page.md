# Streaming Research Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blocking research flow with a dedicated streaming research page where users see the agent's steps (search queries, article scrapes, reasoning) in real-time as a chat-style log.

**Architecture:** Split the current `POST /api/newsletters/[id]/issues` into a lightweight issue-creation endpoint and add a streaming SSE endpoint for the agent research. New research page renders SSE events as chat messages using existing `Streamdown` component.

**Tech Stack:** Next.js App Router, Mastra `agent.stream()` + `fullStream`, SSE (Server-Sent Events), `fetch` + `ReadableStream`, React `useEffect`, `Streamdown`

**Important:** Before writing any code, verify the Mastra `fullStream` chunk shape by checking the installed `@mastra/core` source. The chunk types assumed in this plan are `"tool-call"`, `"tool-result"`, `"text-delta"`, and `"finish"`. If the actual chunk types differ, adjust accordingly.

---

### Task 1: Split Issue Creation from Research

**Files:**
- Modify: `app/api/newsletters/[id]/issues/route.ts`

Currently this route does everything in one blocking POST: creates Issue, runs agent, creates Topics. We need to split it so issue creation is lightweight and research is streaming.

- [ ] **Step 1: Create a lightweight issue-creation endpoint**

Replace the `POST` handler to only create the Issue (no agent, no topics). The research streaming moves to a new endpoint.

```typescript
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
```

Remove the agent call, `parseTopicsJson`, and `topic.createMany` — those move to the research streaming endpoint in Task 2.

- [ ] **Step 2: Verify build compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add app/api/newsletters/
git commit -m "refactor: split issue creation from research — POST now lightweight"
```

---

### Task 2: Create Streaming Research Endpoint

**Files:**
- Create: `app/api/issues/[id]/research/route.ts`

New endpoint: `POST /api/issues/[id]/research` — streams agent research as SSE.

- [ ] **Step 1: Write the streaming endpoint**

Create `app/api/issues/[id]/research/route.ts`:

```typescript
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
      const enqueue = (event: string, data: unknown) => {
        if (isClosed) return;
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
          toolCallId?: string;
          toolName?: string;
          args?: unknown;
          result?: unknown;
          textDelta?: string;
        }>) {
          if (isClosed) break;

          if (chunk.type === "tool-call") {
            enqueue("step", {
              type: "tool-call",
              tool: chunk.toolName,
              input: chunk.args,
            });
          } else if (chunk.type === "tool-result") {
            enqueue("step", {
              type: "tool-result",
              tool: chunk.toolName,
              output: chunk.result,
            });
          } else if (chunk.type === "text-delta") {
            accumulatedText += chunk.textDelta ?? "";
            enqueue("step", {
              type: "text",
              content: chunk.textDelta,
            });
          }
        }

        // Parse final output and create topics
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
```

**Important:** The chunk types (`"tool-call"`, `"tool-result"`, `"text-delta"`) and property names (`chunk.toolName`, `chunk.args`, `chunk.result`, `chunk.textDelta`) must match the actual Mastra `fullStream` chunk shape. Check the installed version if these don't work.

- [ ] **Step 2: Verify build compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no type errors. May need to adjust the `AsyncIterable` type annotation to match Mastra's actual chunk type.

- [ ] **Step 3: Commit**

```bash
git add app/api/issues/[id]/research/
git commit -m "feat: add streaming SSE research endpoint"
```

---

### Task 3: Create Research Page (Client Component)

**Files:**
- Create: `app/dashboard/newsletter/[id]/issue/[issueId]/research/page.tsx`
- Create: `app/dashboard/newsletter/[id]/issue/[issueId]/research/research-stream.tsx`

- [ ] **Step 1: Create the server page wrapper**

Create `app/dashboard/newsletter/[id]/issue/[issueId]/research/page.tsx`:

```typescript
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ResearchStream } from "./research-stream";
import { IssueStepper } from "@/components/dashboard/issue-stepper";

export default async function ResearchPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-3">
        <Link
          href={`/dashboard/newsletter/${id}`}
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Back to newsletter
        </Link>
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step 1 of 4
          </span>
          <h1
            className="text-4xl tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-hero-display)", lineHeight: 1.05 }}
          >
            Research in progress.
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            The agent is searching for articles, scraping content, and analyzing
            sources. Watch the process unfold below.
          </p>
        </div>
        <IssueStepper current="research" newsletterId={id} issueId={issueId} />
      </div>
      <ResearchStream issueId={issueId} newsletterId={id} />
    </div>
  );
}
```

- [ ] **Step 2: Create the ResearchStream client component**

Create `app/dashboard/newsletter/[id]/issue/[issueId]/research/research-stream.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Search, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Streamdown } from "streamdown";

type StepType = "tool-call" | "tool-result" | "text";

interface Step {
  type: StepType;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  content?: string;
  id: number;
}

type Status = "connecting" | "streaming" | "done" | "error";

function ToolIcon({ tool }: { tool?: string }) {
  if (tool === "google-news-search") return <Search className="size-4" />;
  if (tool === "fetch-page") return <FileText className="size-4" />;
  return <Loader2 className="size-4" />;
}

function StepCard({ step }: { step: Step }) {
  if (step.type === "tool-call") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ToolIcon tool={step.tool} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {step.tool}
          </p>
          <p className="text-sm text-foreground truncate">
            {JSON.stringify(step.input)}
          </p>
        </div>
      </div>
    );
  }

  if (step.type === "tool-result") {
    const resultCount =
      step.output && "results" in step.output && Array.isArray(step.output.results)
        ? step.output.results.length
        : null;
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {step.tool} — complete
          </p>
          <p className="text-sm text-foreground">
            {resultCount !== null ? `Found ${resultCount} results` : "Done"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquare className="size-4" />
      </span>
      <div className="min-w-0 flex-1 text-sm text-foreground">
        <Streamdown>{step.content ?? ""}</Streamdown>
      </div>
    </div>
  );
}

export function ResearchStream({
  issueId,
  newsletterId,
}: {
  issueId: string;
  newsletterId: string;
}) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>([]);
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [, setTopicCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [steps, scrollToBottom]);

  useEffect(() => {
    const controller = new AbortController();

    async function connect() {
      try {
        const response = await fetch(`/api/issues/${issueId}/research`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? "Failed to connect",
          );
        }

        setStatus("streaming");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const lines = part.split("\n");
            let eventType = "";
            let data = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7);
              } else if (line.startsWith("data: ")) {
                data = line.slice(6);
              }
            }

            if (!data) continue;

            try {
              const parsed = JSON.parse(data);

              if (eventType === "step") {
                setSteps((prev) => [
                  ...prev,
                  { ...parsed, id: idCounter.current++ } as Step,
                ]);
              } else if (eventType === "done") {
                setTopicCount(parsed.topicCount);
                setStatus("done");
              } else if (eventType === "error") {
                setError(parsed.message);
                setStatus("error");
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Connection lost");
        setStatus("error");
      }
    }

    connect();

    return () => controller.abort();
  }, [issueId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex max-h-[500px] flex-col gap-3 overflow-y-auto">
          {status === "connecting" && steps.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin" />
              Connecting to research agent…
            </div>
          )}

          {steps.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}

          {status === "streaming" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="size-4 animate-spin" />
              Agent is working…
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {status === "done" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-400/30 dark:bg-emerald-500/5 px-6 py-8">
          <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
          <div className="text-center space-y-1">
            <p className="text-lg font-medium text-foreground">Research complete</p>
            <p className="text-sm text-muted-foreground">
              Topics have been created. Review and approve them before drafting.
            </p>
          </div>
          <Button
            onClick={() =>
              router.push(
                `/dashboard/newsletter/${newsletterId}/issue/${issueId}/topics`,
              )
            }
            className="cursor-pointer"
          >
            View Topics
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>
            {error ?? "An unexpected error occurred during research."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors. Fix any type issues with the `Streamdown` import path or Mastra chunk types.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/newsletter/
git commit -m "feat: add streaming research page with chat-style log"
```

---

### Task 4: Update Navigation — Create Issue Form

**Files:**
- Modify: `app/dashboard/newsletter/[id]/create-article-form.tsx`

Change the navigation target from `.../topics` to `.../research`.

- [ ] **Step 1: Update navigation**

In `create-article-form.tsx`, change the `onSuccess` callback:

```typescript
// Before:
router.push(
  `/dashboard/newsletter/${newsletterId}/issue/${data.issueId}/topics`,
);

// After:
router.push(
  `/dashboard/newsletter/${newsletterId}/issue/${data.issueId}/research`,
);
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/newsletter/[id]/create-article-form.tsx
git commit -m "feat: navigate to research page after issue creation"
```

Note: The `createIssue` function in `lib/mutation/issue-mutations.ts` already returns `{ issueId, threadId }` — no changes needed there since the lightweight POST still returns that shape.

---

### Task 5: Update Navigation — Issues List

**Files:**
- Modify: `app/dashboard/newsletter/[id]/issues-list.tsx`

Link `RESEARCHING` and `DRAFTING` status issues to the research page instead of topics.

- [ ] **Step 1: Update link logic**

In `issues-list.tsx`, change the `editTarget` logic:

```typescript
// Before:
const editTarget =
  issue.status === "REVIEWING" || issue.status === "PUBLISHED"
    ? "draft"
    : "topics";

// After:
const editTarget =
  issue.status === "REVIEWING" || issue.status === "PUBLISHED"
    ? "draft"
    : issue.status === "RESEARCHING"
      ? "research"
      : "topics";
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/newsletter/[id]/issues-list.tsx
git commit -m "feat: link researching issues to research page"
```

---

### Task 6: Update Stepper — 4 Steps

**Files:**
- Modify: `components/dashboard/issue-stepper.tsx`

Add "Research" as step 1 of 4.

- [ ] **Step 1: Add research step**

In `issue-stepper.tsx`, update the `Step` type and `STEPS` array:

```typescript
import { Search } from "lucide-react";

type Step = "research" | "topics" | "draft" | "publish";

const STEPS: { id: Step; label: string; description: string; icon: typeof Check }[] = [
  { id: "research", label: "Research", description: "Agent gathers", icon: Search },
  { id: "topics", label: "Topics", description: "Curate sources", icon: Lightbulb },
  { id: "draft", label: "Draft", description: "Edit copy", icon: FileText },
  { id: "publish", label: "Publish", description: "Send to readers", icon: Send },
];
```

Update the `href` logic for the "publish" special case (step 4 now):

```typescript
const href =
  step.id === "publish"
    ? `/dashboard/newsletter/${newsletterId}/issue/${issueId}/draft`
    : `/dashboard/newsletter/${newsletterId}/issue/${issueId}/${step.id}`;
```

This already works with the new 4-step array since the href pattern is `/{step.id}`.

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/issue-stepper.tsx
git commit -m "feat: add research step to issue stepper"
```

---

### Task 7: Update Topics Page

**Files:**
- Modify: `app/dashboard/newsletter/[id]/issue/[issueId]/topics/page.tsx`

Update the step label from "Step 1 of 3" to "Step 2 of 4".

- [ ] **Step 1: Update step label**

```typescript
// Before:
<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
  Step 1 of 3
</span>

// After:
<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
  Step 2 of 4
</span>
```

Also update the `IssueStepper` current step from `"topics"` — this stays the same, but the stepper now accepts `"research"` as a valid step.

- [ ] **Step 2: Update draft page step label**

In `app/dashboard/newsletter/[id]/issue/[issueId]/draft/page.tsx`, update from "Step 2 of 3" to "Step 3 of 4" and `current` from `"draft"` — this stays the same.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/newsletter/[id]/issue/[issueId]/topics/page.tsx app/dashboard/newsletter/[id]/issue/[issueId]/draft/page.tsx
git commit -m "chore: update step labels for 4-step flow"
```

---

### Task 8: Manual Verification

**No code changes.** Verification task.

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test the flow**

1. Open the dashboard, navigate to a newsletter
2. Enter a niche and click "Start research"
3. Verify you are navigated to the research page
4. Watch the agent steps stream in: tool calls (google-news-search, fetch-page), results, text
5. Wait for "Research complete" and "View Topics" button
6. Click "View Topics" — verify topics are populated
7. Verify stepper shows 4 steps with Research as complete
8. Continue through Topics → Draft flow normally

- [ ] **Step 3: Test error case**

1. Disconnect network during streaming
2. Verify error alert appears
3. Navigate back to newsletter — issue should still exist in RESEARCHING status

- [ ] **Step 4: Stop dev server**

---

### Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all existing tests pass.

- [ ] **Step 2: Run full build**

```bash
pnpm build
```

Expected: successful build.

- [ ] **Step 3: Commit any remaining changes**

```bash
git status
git add -A
git commit -m "chore: final cleanup and verification"
```
