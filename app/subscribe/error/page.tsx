import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscribeErrorPage() {
  return (
    <main
      className="flex min-h-screen w-full items-center justify-center px-6 py-12"
      style={{ fontFamily: "var(--font-hero-body)" }}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
        >
          <ShieldAlert className="size-8" />
        </span>
        <div className="space-y-2">
          <h1
            className="text-4xl tracking-tight text-foreground"
            style={{
              fontFamily: "var(--font-hero-display)",
              lineHeight: 1.05,
            }}
          >
            Link expired.
          </h1>
          <p className="text-base text-muted-foreground">
            This confirmation link is invalid or has expired. Head back to the
            newsletter page and request a fresh email.
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
