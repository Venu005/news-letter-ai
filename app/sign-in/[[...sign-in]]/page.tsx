import { SignIn } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
        </CardContent>
      </Card>
    </main>
  );
}
