import { Spinner } from "@/components/ui/spinner";

/** Shown while Clerk auth UI or segment is loading. */
export function AuthFormFallback() {
  return (
    <div
      className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-xl border border-black/8 bg-[#FAFAFC] px-6 py-16"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <Spinner className="size-8 text-[#0F172A]" />
      <p className="text-sm text-[#64748B]">Loading…</p>
    </div>
  );
}
