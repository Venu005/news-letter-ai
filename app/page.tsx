import { HomeForm } from "./home-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="flex max-w-lg flex-col gap-2 text-center sm:text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Newsletter AI
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Enter a niche to generate research-backed topics, then draft your newsletter.
        </p>
      </div>
      <HomeForm />
    </div>
  );
}
