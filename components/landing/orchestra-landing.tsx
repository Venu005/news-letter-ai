import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  FileEditIcon,
  Globe2Icon,
  PlayCircleIcon,
} from "lucide-react";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCp5JuG9nwxyrTMM8eTbTkm9WUVVf11UTDERaZFESQ0U1yIZu79L2SvEhgHOHl3ui3Rar9ny8P6sA-BW5YTuxcRvIsI_0oE2R47vDKuKMax5ZiRJ77aOQGWFEHHzqvCyKP-1k1iBUtU_TVcf-4tCvRr4DXwnoVLEXDMKtLsTfxCDsIIYpLSLr8kIXM4qpxW3TlwY13LC70qvzuxiOmmK3IOJ4MRaQOywBlRwt_GsSNh2XUYDg665wtEAYN57FhbtamukjW1sPLkxDj2";

type OrchestraLandingProps = {
  signedIn: boolean;
};

export function OrchestraLanding({ signedIn }: OrchestraLandingProps) {
  return (
    <div className="bg-background text-foreground font-orch-body flex min-h-screen flex-col antialiased">
      <nav className="border-border bg-card/80 sticky top-0 z-50 mx-auto flex w-full max-w-intel-container items-center justify-between border-b px-intel-margin py-intel-stack-md shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-intel-gutter">
          <span className="font-orch-heading text-orch-h3 text-foreground font-black tracking-tight">
            Orchestra AI
          </span>
          <div className="ml-intel-margin hidden gap-intel-stack-md md:flex">
            <a
              className="border-intel-accent font-orch-body text-orch-label-md text-foreground border-b-2 pb-1 font-semibold tracking-[0.02em]"
              href="#features"
            >
              Features
            </a>
            <a
              className="font-orch-body text-orch-label-md text-muted-foreground hover:text-intel-accent transition-all duration-200 font-semibold tracking-[0.02em]"
              href="#how-it-works"
            >
              How it Works
            </a>
            <a
              className="font-orch-body text-orch-label-md text-muted-foreground hover:text-intel-accent transition-all duration-200 font-semibold tracking-[0.02em]"
              href="#testimonials"
            >
              Testimonials
            </a>
            <a
              className="font-orch-body text-orch-label-md text-muted-foreground hover:text-intel-accent transition-all duration-200 font-semibold tracking-[0.02em]"
              href="#pricing"
            >
              Pricing
            </a>
          </div>
        </div>
        <div className="flex items-center gap-intel-stack-sm">
          {signedIn ? (
            <Link
              className="font-orch-body text-orch-label-md text-muted-foreground hover:text-intel-accent rounded border border-transparent px-4 py-2 transition-all duration-200 hover:bg-muted font-semibold tracking-[0.02em]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              className="font-orch-body text-orch-label-md text-muted-foreground hover:text-intel-accent rounded border border-transparent px-4 py-2 transition-all duration-200 hover:bg-muted font-semibold tracking-[0.02em]"
              href="/sign-in"
            >
              Login
            </Link>
          )}
          <Link
            className="font-orch-body text-orch-label-md bg-primary text-primary-foreground rounded-sm px-4 py-2 font-semibold tracking-[0.02em] shadow-sm transition-all duration-300 hover:bg-primary/90"
            href={signedIn ? "/dashboard" : "/sign-up"}
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="grow">
        <section
          className="mx-auto flex w-full max-w-intel-container flex-col items-center px-intel-margin py-24 text-center md:py-32"
          id="how-it-works"
        >
          <h1 className="font-orch-heading text-orch-h1 text-foreground mb-intel-stack-md max-w-4xl font-bold tracking-[-0.02em]">
            Orchestrate Your Newsletter with AI Precision.
          </h1>
          <p className="font-orch-body text-orch-body-lg text-muted-foreground mb-intel-stack-lg max-w-3xl">
            A trio of specialized AI agents—Search, Writer, and Editor—working
            together to craft, verify, and publish expert-level newsletters in
            your niche.
          </p>
          <div className="mb-20 flex gap-intel-stack-md">
            <Link
              className="font-orch-body text-orch-label-md bg-intel-accent text-intel-accent-foreground flex items-center gap-2 rounded-sm px-6 py-3 font-semibold tracking-[0.02em] shadow-sm transition-all duration-300 hover:bg-intel-accent/90"
              href={signedIn ? "/dashboard" : "/sign-up"}
            >
              Get Started for Free
              <ArrowRightIcon aria-hidden className="size-5 shrink-0" />
            </Link>
            <button
              type="button"
              className="font-orch-body text-orch-label-md border-border text-foreground flex items-center gap-2 rounded-sm border px-6 py-3 font-semibold tracking-[0.02em] transition-all duration-300 hover:bg-muted"
            >
              Watch the Demo
              <PlayCircleIcon aria-hidden className="size-5 shrink-0" />
            </button>
          </div>

          <div className="border-border bg-card shadow-primary/5 relative w-full max-w-5xl overflow-hidden rounded-lg border p-intel-stack-sm shadow-xl">
            <Image
              alt="Agent workflow: three agent nodes connected by lines in a light, modern palette"
              className="aspect-video h-auto w-full rounded object-cover opacity-90"
              height={675}
              priority
              src={HERO_IMAGE}
              width={1200}
            />
          </div>
        </section>

        <section
          className="border-border bg-card w-full border-y py-intel-stack-lg"
          id="testimonials"
        >
          <div className="mx-auto max-w-intel-container px-intel-margin text-center">
            <p className="font-orch-body text-orch-label-sm text-muted-foreground mb-intel-stack-md font-medium uppercase tracking-widest">
              Trusted by 500+ newsletter creators
            </p>
            <div className="flex flex-wrap items-center justify-center gap-12 opacity-60 grayscale">
              <span className="font-orch-heading text-orch-h3 text-foreground font-bold">
                Acme Corp
              </span>
              <span className="font-orch-heading text-orch-h3 text-foreground font-bold">
                Globex
              </span>
              <span className="font-orch-heading text-orch-h3 text-foreground font-bold">
                Soylent
              </span>
              <span className="font-orch-heading text-orch-h3 text-foreground font-bold">
                Initech
              </span>
              <span className="font-orch-heading text-orch-h3 text-foreground font-bold">
                Umbrella
              </span>
            </div>
          </div>
        </section>

        <section
          className="mx-auto w-full max-w-intel-container px-intel-margin py-24"
          id="features"
        >
          <div className="mb-16 text-center">
            <h2 className="font-orch-heading text-orch-h2 text-foreground mb-intel-stack-sm font-semibold tracking-[-0.01em]">
              The Agent Trio
            </h2>
            <p className="font-orch-body text-orch-body-md text-muted-foreground mx-auto max-w-2xl">
              Three distinct intelligences operating in perfect sync to automate
              your editorial workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-intel-gutter md:grid-cols-3">
            <div className="border-border bg-card flex flex-col items-start rounded-sm border p-intel-margin transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="bg-primary/10 text-primary mb-intel-stack-md flex h-12 w-12 items-center justify-center rounded-sm">
                <Globe2Icon aria-hidden className="size-6 shrink-0" strokeWidth={2} />
              </div>
              <h3 className="font-orch-heading text-orch-h3 text-foreground border-border mb-intel-stack-sm w-full border-b pb-2 font-semibold">
                Search Agent
              </h3>
              <p className="font-orch-body text-orch-body-md text-muted-foreground">
                Scours the web for real-time trends, breaking news, and highly
                relevant data points within your specified niche parameters.
              </p>
            </div>
            <div className="border-border bg-card flex flex-col items-start rounded-sm border p-intel-margin transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="bg-intel-accent/10 text-intel-accent mb-intel-stack-md flex h-12 w-12 items-center justify-center rounded-sm">
                <FileEditIcon aria-hidden className="size-6 shrink-0" strokeWidth={2} />
              </div>
              <h3 className="font-orch-heading text-orch-h3 text-foreground border-border mb-intel-stack-sm w-full border-b pb-2 font-semibold">
                Writer Agent
              </h3>
              <p className="font-orch-body text-orch-body-md text-muted-foreground">
                Drafts compelling long-form content adhering to strict citation
                rules, maintaining flow while synthesizing complex information.
              </p>
            </div>
            <div className="border-border bg-card flex flex-col items-start rounded-sm border p-intel-margin transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="bg-muted text-foreground mb-intel-stack-md flex h-12 w-12 items-center justify-center rounded-sm">
                <BadgeCheckIcon aria-hidden className="size-6 shrink-0" strokeWidth={2} />
              </div>
              <h3 className="font-orch-heading text-orch-h3 text-foreground border-border mb-intel-stack-sm w-full border-b pb-2 font-semibold">
                Editor Agent
              </h3>
              <p className="font-orch-body text-orch-body-md text-muted-foreground">
                Acts as the supervisor. Ensures absolute quality, consistent tone
                of voice, brand alignment, and final factual verification.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-primary text-primary-foreground w-full py-24" id="pricing">
          <div className="mx-auto max-w-intel-container px-intel-margin text-center">
            <h2 className="font-orch-heading text-orch-h1 text-primary-foreground mb-intel-stack-md font-bold tracking-[-0.02em]">
              Stop Manual Research.
              <br />
              Start Orchestrating.
            </h2>
            <p className="font-orch-body text-orch-body-lg text-primary-foreground/80 mx-auto mb-intel-stack-lg max-w-2xl">
              Join the platform redefining how expert newsletters are built.
            </p>
            <Link
              className="font-orch-body text-orch-label-md bg-intel-accent text-intel-accent-foreground inline-block rounded-sm px-8 py-4 font-semibold tracking-[0.02em] shadow-md transition-all duration-300 hover:bg-intel-accent/90"
              href={signedIn ? "/dashboard" : "/sign-up"}
            >
              Get Started Now
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-border bg-card flex w-full flex-col items-center justify-between gap-intel-stack-md border-t px-intel-margin py-intel-stack-lg md:flex-row">
        <div className="flex items-center">
          <span className="font-orch-heading text-foreground text-lg font-bold tracking-tight">
            Orchestra AI
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-intel-stack-md text-center md:text-left">
          <a
            className="font-orch-body text-orch-body-sm text-muted-foreground hover:text-foreground transition-colors"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="font-orch-body text-orch-body-sm text-muted-foreground hover:text-foreground transition-colors"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="font-orch-body text-orch-body-sm text-muted-foreground hover:text-foreground transition-colors"
            href="#"
          >
            Contact Support
          </a>
          <a
            className="font-orch-body text-orch-body-sm text-muted-foreground hover:text-foreground transition-colors"
            href="#"
          >
            API Documentation
          </a>
          <a
            className="font-orch-body text-orch-body-sm text-muted-foreground hover:text-foreground transition-colors"
            href="#"
          >
            Twitter
          </a>
          <a
            className="font-orch-body text-orch-body-sm text-muted-foreground hover:text-foreground transition-colors"
            href="#"
          >
            LinkedIn
          </a>
        </div>
        <div>
          <p className="font-orch-body text-orch-body-sm text-muted-foreground text-center md:text-right">
            © 2026 Orchestra AI. Precision Modernism in Newsletter Orchestration.
          </p>
        </div>
      </footer>
    </div>
  );
}
