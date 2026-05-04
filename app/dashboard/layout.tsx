import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers/query-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueryProvider>
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-end gap-3 border-b px-8 py-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">Home</Link>
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <UserButton />
      </header>
      {children}
    </div>
    </QueryProvider>
  );
}
