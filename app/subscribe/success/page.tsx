import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubscribeSuccessPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>You are subscribed</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Thanks — you can close this tab.</AlertDescription>
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
