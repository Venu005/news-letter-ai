"use client";

import Link from "next/link";
import { OrchestraBrandLink } from "@/components/layout/orchestra-brand-link";
import { ORCHESTRA_HERO_VIDEO_URL } from "@/lib/orchestra-hero-video";
import { FadingVideo } from "./fading-video";

interface CinematicLandingProps {
  signedIn: boolean;
}

export function CinematicLanding({ signedIn }: CinematicLandingProps) {
  const ctaHref = signedIn ? "/dashboard" : "/sign-up";

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-white text-black"
      style={{ fontFamily: "var(--font-hero-body)" }}
    >
      <FadingVideo
        src={ORCHESTRA_HERO_VIDEO_URL}
        className="absolute inset-0 z-0 min-h-full w-full object-cover object-[50%_42%] md:object-[50%_38%]"
      />

      <div
        className="pointer-events-none absolute inset-0 z-1 bg-linear-to-b from-white via-transparent to-white"
        aria-hidden
      />

      <header className="relative z-10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6 backdrop-blur-md supports-backdrop-filter:bg-white/55">
          <OrchestraBrandLink />

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/"
              className="text-sm text-black transition-colors hover:text-black/80"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-[#6F6F6F] transition-colors hover:text-black/80"
            >
              Studio
            </Link>
            <Link
              href="#"
              scroll={false}
              className="text-sm text-[#6F6F6F] transition-colors hover:text-black/80"
            >
              About
            </Link>
            <Link
              href="#"
              scroll={false}
              className="text-sm text-[#6F6F6F] transition-colors hover:text-black/80"
            >
              Journal
            </Link>
            <Link
              href="/sign-in"
              className="text-sm text-[#6F6F6F] transition-colors hover:text-black/80"
            >
              Reach Us
            </Link>
          </div>

          <Link
            href={ctaHref}
            className="rounded-full bg-black px-6 py-2.5 text-sm text-white transition-transform hover:scale-[1.03]"
          >
            Start building
          </Link>
        </nav>
      </header>

      <section
        className="relative z-10 flex flex-col items-center justify-center px-6 pb-40 text-center"
        style={{ paddingTop: "calc(8rem - 75px)" }}
      >
        <h1
          className="animate-fade-rise max-w-4xl text-3xl font-normal text-black sm:max-w-5xl sm:text-5xl md:max-w-6xl md:text-6xl"
          style={{
            fontFamily: "var(--font-hero-display)",
            lineHeight: 1.02,
            letterSpacing: "-0.06em",
          }}
        >
          Orchestra is your newsletter builder—from{" "}
          <em className="italic text-[#6F6F6F]">research and rough notes</em>{" "}
          to{" "}
          <em className="italic text-[#6F6F6F]">
            editions you are proud to send.
          </em>
        </h1>

        <p className="animate-fade-rise-delay mt-6 max-w-xl text-sm leading-relaxed text-[#6F6F6F] sm:mt-8 sm:max-w-2xl sm:text-base">
          Pick a niche, gather sources, draft each issue, and tighten the copy
          before you publish—all in one workflow. Search, Writer, and Editor
          agents help you ship newsletters that read clearly, cite what matters,
          and still sound like you.
        </p>

        <Link
          href={ctaHref}
          className="animate-fade-rise-delay-2 mt-10 rounded-full bg-black px-10 py-3.5 text-sm text-white transition-transform hover:scale-[1.03] sm:mt-12 sm:px-12 sm:py-4 sm:text-base"
        >
          Start building
        </Link>
      </section>
    </div>
  );
}
