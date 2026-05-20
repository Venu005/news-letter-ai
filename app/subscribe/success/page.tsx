import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscribeSuccessPage() {
  return (
    <main
      className="flex min-h-screen w-full items-center justify-center px-6 py-12"
      style={{ fontFamily: "var(--font-hero-body)" }}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        >
          <CheckCircle2 className="size-8" />
        </span>
        <div className="space-y-2">
          <h1
            className="text-4xl tracking-tight text-foreground"
            style={{
              fontFamily: "var(--font-hero-display)",
              lineHeight: 1.05,
            }}
          >
            You&apos;re subscribed.
          </h1>
          <p className="text-base text-muted-foreground">
            Thanks for confirming — the next issue will land in your inbox. You
            can close this tab.
          </p>
        </div>
        <Button variant="outline" asChild className="cursor-pointer">
          <Link href="/">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
        </Button>
      </div>
    </main>
  );
}
