"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Edit3,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match: (pathname: string) => boolean;
};

const WORKFLOW_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p) => p === "/dashboard",
  },
  {
    href: "/dashboard",
    label: "Research",
    icon: Search,
    match: (p) => /\/issue\/[^/]+\/(research|topics)/.test(p),
  },
  {
    href: "/dashboard",
    label: "Drafting",
    icon: Edit3,
    match: (p) => /\/issue\/[^/]+\/draft/.test(p),
  },
  {
    href: "/dashboard",
    label: "AI Agents",
    icon: Sparkles,
    match: () => false,
  },
  {
    href: "/dashboard",
    label: "Settings",
    icon: Settings,
    match: () => false,
  },
];

function navHref(item: NavItem, pathname: string): string {
  if (item.label === "Dashboard") return "/dashboard";
  const match = pathname.match(/\/dashboard\/newsletter\/([^/]+)\/issue\/([^/]+)/);
  if (!match) return "/dashboard";
  const [, newsletterId, issueId] = match;
  if (item.label === "Research") {
    return `/dashboard/newsletter/${newsletterId}/issue/${issueId}/topics`;
  }
  if (item.label === "Drafting") {
    return `/dashboard/newsletter/${newsletterId}/issue/${issueId}/draft`;
  }
  return "/dashboard";
}

export function OrchestraDashboardSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[var(--intel-surface-container-high)] bg-[var(--intel-surface-container-lowest)]"
    >
      <SidebarHeader className="px-4 pt-6">
        <Link
          href="/dashboard"
          className="mb-6 flex items-center gap-3 px-2 transition-opacity hover:opacity-90"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded bg-[var(--intel-primary)] font-[family-name:var(--font-orch-heading)] text-sm font-bold text-[var(--intel-on-primary)]">
            O
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block font-[family-name:var(--font-orch-heading)] text-lg font-bold leading-none tracking-tight text-[var(--intel-on-surface)]">
              Orchestra AI
            </span>
            <span className="mt-1 block font-[family-name:var(--font-orch-body)] text-orch-label-sm uppercase tracking-wider text-[var(--intel-on-surface-variant)]">
              Newsletter Engine
            </span>
          </span>
        </Link>

        <Button
          asChild
          className="h-10 w-full justify-center gap-2 bg-[var(--intel-primary)] font-[family-name:var(--font-orch-body)] text-orch-label-md text-[var(--intel-on-primary)] hover:bg-[var(--intel-primary)]/90 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-0"
        >
          <Link href="/dashboard#create-newsletter">
            <Plus className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">New Draft</span>
          </Link>
        </Button>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-2 py-2">
        <SidebarMenu className="gap-1">
          {WORKFLOW_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            const href = navHref(item, pathname);
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={cn(
                    "h-10 rounded font-[family-name:var(--font-orch-body)] text-orch-label-md",
                    active &&
                      "border-r-2 border-[var(--intel-secondary)] bg-[var(--intel-secondary-fixed)]/30 font-semibold text-[var(--intel-secondary)]",
                  )}
                >
                  <Link href={href}>
                    <Icon className="size-5" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--intel-surface-container-high)] px-2 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Support">
              <a href="mailto:support@orchestra.app">
                <LifeBuoy className="size-5" />
                <span>Support</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Help & docs">
              <a href="https://mastra.ai/llms.txt" target="_blank" rel="noreferrer">
                <HelpCircle className="size-5" />
                <span>Help & docs</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
