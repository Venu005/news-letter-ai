import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Newsletter AI</CardTitle>
          <CardDescription className="text-base">
            Sign in to generate research-backed topics, refine drafts, publish,
            and share a public subscribe page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {userId ? (
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                No account yet?{" "}
                <Button
                  variant="link"
                  className="inline h-auto p-0 text-sm"
                  asChild
                >
                  <Link href="/sign-up">Sign up</Link>
                </Button>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
