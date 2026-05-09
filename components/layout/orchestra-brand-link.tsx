import Link from "next/link";

export function OrchestraBrandLink({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex flex-wrap items-baseline gap-x-1.5 text-2xl tracking-tight text-black sm:text-3xl"
    >
      <span style={{ fontFamily: "var(--font-hero-display)" }}>
        Orchestra
        <sup className="text-sm leading-none sm:text-base">®</sup>
      </span>
      <span
        className="text-sm font-medium tracking-tight text-[#6F6F6F] sm:text-base"
        style={{ fontFamily: "var(--font-hero-body)" }}
      >
        — AI Newsletter Builder
      </span>
    </Link>
  );
}
