import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="flex max-w-lg flex-col gap-2 text-center sm:text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Newsletter AI
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Sign in to generate research-backed topics, refine drafts, publish, and share a public subscribe page.
        </p>
      </div>
      {userId ? (
        <Link
          href="/dashboard"
          className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Go to dashboard
        </Link>
      ) : (
        <>
          <Link
            href="/sign-in"
            className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Sign in
          </Link>
          <p className="text-sm text-zinc-500">
            No account yet?{" "}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
