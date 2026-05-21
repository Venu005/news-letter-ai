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
