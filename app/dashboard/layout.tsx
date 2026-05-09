import { OrchestraDashboardHeader } from "@/components/layout/orchestra-dashboard-header";
import { QueryProvider } from "@/components/providers/query-provider";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueryProvider>
      <div
        className="flex min-h-full flex-col bg-white text-black"
        style={{ fontFamily: "var(--font-hero-body)" }}
      >
        <OrchestraDashboardHeader />
        {children}
      </div>
    </QueryProvider>
  );
}
