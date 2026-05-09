import Link from "next/link";
import { FadingVideo } from "@/components/landing/fading-video";
import { ORCHESTRA_HERO_VIDEO_URL } from "@/lib/orchestra-hero-video";

type OrchestraAuthLayoutProps = {
  children: React.ReactNode;
  /** Left panel headline (Instrument Serif). */
  visualHeadline: string;
  /** Left panel supporting line. */
  visualSubline: string;
  /** Shown above the Clerk form (Instrument Serif). */
  panelTitle: string;
  /** Supporting line under the title (Inter). */
  panelDescription: string;
};

/**
 * Split auth: cinematic media left, form right. Right column scrolls when
 * content is tall (e.g. sign-up). No extra card wrapper around Clerk.
 */
export function OrchestraAuthLayout({
  children,
  visualHeadline,
  visualSubline,
  panelTitle,
  panelDescription,
}: OrchestraAuthLayoutProps) {
  return (
    <div
      className="flex min-h-dvh flex-col bg-[#FAFAFA] text-[#0F172A] lg:h-dvh lg:max-h-dvh lg:flex-row lg:overflow-hidden lg:bg-white"
      style={{ fontFamily: "var(--font-hero-body)" }}
    >
      {/* —— Visual panel —— */}
      <aside className="relative min-h-[38vh] w-full shrink-0 overflow-hidden lg:h-full lg:min-h-0 lg:w-[46%]">
        <FadingVideo
          src={ORCHESTRA_HERO_VIDEO_URL}
          className="absolute inset-0 h-full w-full scale-105 object-cover object-[50%_42%] motion-reduce:hidden lg:object-[50%_38%]"
        />
        <div
          className="absolute inset-0 hidden bg-[#0F172A] motion-reduce:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#0F172A]/75 via-[#0F172A]/20 to-[#0F172A]/35"
          aria-hidden
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 lg:p-10">
          <p
            className="text-xl font-normal leading-tight tracking-tight text-white sm:text-2xl lg:text-[1.65rem] lg:leading-[1.15]"
            style={{ fontFamily: "var(--font-hero-display)" }}
          >
            {visualHeadline}
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">
            {visualSubline}
          </p>
        </div>
      </aside>

      {/* —— Form panel: scrolls independently on desktop —— */}
      <div className="flex min-h-0 flex-1 flex-col lg:min-h-0 lg:w-[54%] lg:overflow-y-auto">
        <div className="mx-auto w-full max-w-[420px] px-5 py-8 sm:px-8 lg:py-10 xl:px-10">
          <Link
            href="/"
            className="orchestra-heading inline-block text-xl text-[#0F172A] transition-colors duration-200 hover:text-black sm:text-2xl cursor-pointer"
          >
            Orchestra<sup className="text-xs sm:text-sm">®</sup>
          </Link>
          <p className="mt-0.5 text-sm font-medium text-[#64748B]">
            AI newsletter builder
          </p>

          <div className="mt-5 space-y-1.5 sm:mt-6">
            <h1
              className="text-2xl font-normal tracking-tight text-[#0F172A] sm:text-[1.75rem] sm:leading-tight"
              style={{ fontFamily: "var(--font-hero-display)" }}
            >
              {panelTitle}
            </h1>
            <p className="text-sm leading-relaxed text-[#64748B] sm:text-base">
              {panelDescription}
            </p>
          </div>

          <div className="mt-5 sm:mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
