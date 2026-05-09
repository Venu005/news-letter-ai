"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { OrchestraBrandLink } from "@/components/layout/orchestra-brand-link";
import { Separator } from "@/components/ui/separator";

export function OrchestraDashboardHeader() {
  return (
    <header className="relative z-10 border-b border-black/6">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-8 py-6 backdrop-blur-md supports-backdrop-filter:bg-white/55">
        <OrchestraBrandLink />
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-[#6F6F6F] transition-colors hover:text-black"
          >
            Home
          </Link>
          <Separator orientation="vertical" className="h-6 bg-black/10" />
          <UserButton />
        </div>
      </nav>
    </header>
  );
}
