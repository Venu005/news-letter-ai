"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type Crumb = { label: string; href?: string };

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || segments[0] !== "dashboard") {
    return [{ label: "Dashboard", href: "/dashboard" }];
  }

  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/dashboard" }];

  // /dashboard/newsletter/[id]/...
  if (segments[1] === "newsletter" && segments[2]) {
    const newsletterHref = `/dashboard/newsletter/${segments[2]}`;
    crumbs.push({ label: "Newsletter", href: newsletterHref });

    // /dashboard/newsletter/[id]/issue/[issueId]/(topics|draft)
    if (segments[3] === "issue" && segments[4]) {
      const stage = segments[5];
      const label =
        stage === "topics"
          ? "Topics"
          : stage === "draft"
            ? "Draft"
            : "Issue";
      crumbs.push({ label });
    }
  }

  return crumbs;
}

export function OrchestraDashboardHeader() {
  const pathname = usePathname() ?? "/dashboard";
  const crumbs = useMemo(() => buildCrumbs(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/65 sm:px-6">
      <SidebarTrigger className="-ml-1 cursor-pointer" />
      <Separator orientation="vertical" className="h-5" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <Fragment key={`${crumb.label}-${idx}`}>
                <BreadcrumbItem>
                  {isLast || !crumb.href ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href} className="cursor-pointer">
                        {crumb.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast ? <BreadcrumbSeparator /> : null}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <UserButton />
      </div>
    </header>
  );
}
