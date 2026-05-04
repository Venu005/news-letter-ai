import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubscribeErrorPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-intel-stack-lg px-intel-margin py-intel-stack-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Link invalid or expired</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Could not confirm</AlertTitle>
            <AlertDescription>
              Request a new confirmation email from the newsletter page.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
