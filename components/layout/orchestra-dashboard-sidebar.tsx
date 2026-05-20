"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HelpCircle,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Plus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  matchPrefix?: string;
};

const PRIMARY_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    matchPrefix: "/dashboard",
  },
];

const RESOURCE_NAV: NavItem[] = [
  {
    href: "/",
    label: "Public site",
    icon: Home,
  },
];

const FOOTER_NAV: NavItem[] = [
  {
    href: "mailto:support@orchestra.app",
    label: "Support",
    icon: LifeBuoy,
  },
  {
    href: "https://mastra.ai/llms.txt",
    label: "Help & docs",
    icon: HelpCircle,
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
  return pathname === item.href;
}

export function OrchestraDashboardSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="group/brand flex items-center gap-3 rounded-md px-2 py-2 text-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            style={{ fontFamily: "var(--font-hero-display)" }}
          >
            <span className="text-base font-medium">O</span>
          </span>
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span
              className="truncate text-base font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-hero-display)" }}
            >
              Orchestra
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Newsletter Studio
            </span>
          </span>
        </Link>

        <Button
          asChild
          size="default"
          className="mt-1 h-9 w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 cursor-pointer"
        >
          <Link href="/dashboard#create-newsletter">
            <Plus className="size-4" aria-hidden="true" />
            <span className="group-data-[collapsible=icon]:hidden">
              New newsletter
            </span>
          </Link>
        </Button>
      </SidebarHeader>

      <SidebarSeparator className="mt-2" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href} className="cursor-pointer">
                        <Icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {RESOURCE_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <Link href={item.href} className="cursor-pointer">
                        <Icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {FOOTER_NAV.map((item) => {
            const Icon = item.icon;
            const isExternal = item.href.startsWith("http") || item.href.startsWith("mailto:");
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild tooltip={item.label}>
                  {isExternal ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="cursor-pointer"
                    >
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <Link href={item.href} className="cursor-pointer">
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
