import { cookies } from "next/headers";
import { OrchestraDashboardHeader } from "@/components/layout/orchestra-dashboard-header";
import { OrchestraDashboardSidebar } from "@/components/layout/orchestra-dashboard-sidebar";
import { IssueWorkflowActionsProvider } from "@/components/dashboard/issue-workflow-actions";
import { QueryProvider } from "@/components/providers/query-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarCookie ? sidebarCookie === "true" : true;

  return (
    <QueryProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        className="text-foreground"
        style={{ fontFamily: "var(--font-hero-body)" }}
        data-surface="studio"
      >
        <OrchestraDashboardSidebar />
        <SidebarInset className="min-w-0 bg-[var(--intel-surface)]">
          <IssueWorkflowActionsProvider>
            <OrchestraDashboardHeader />
            <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col">
              {children}
            </div>
          </IssueWorkflowActionsProvider>
        </SidebarInset>
      </SidebarProvider>
    </QueryProvider>
  );
}
