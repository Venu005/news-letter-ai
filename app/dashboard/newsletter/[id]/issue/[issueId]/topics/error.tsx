"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function TopicsError({ error }: { error: Error }) {
  const isNotFound = error.name === "IssueNotFoundError";
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-intel-stack-md px-8 py-10">
      <Alert variant="destructive">
        <AlertTitle>{isNotFound ? "Issue not found" : "Something went wrong"}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
