import Link from "next/link";
import { DraftEditor } from "./draft-editor";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Draft</h1>
        <div className="flex gap-4 text-sm">
          <Link
            href={`/newsletter/${id}/topics`}
            className="font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Back to topics
          </Link>
          <Link
            href="/"
            className="font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Start over
          </Link>
        </div>
      </div>
      <DraftEditor newsletterId={id} />
    </div>
  );
}
