import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-end gap-4 border-b border-zinc-200 px-8 py-4 dark:border-zinc-800">
        <Link href="/" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          Home
        </Link>
        <UserButton />
      </header>
      {children}
    </div>
  );
}
