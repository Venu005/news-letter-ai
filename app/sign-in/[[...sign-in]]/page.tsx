import { SignIn } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-intel-gutter py-intel-stack-lg">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
        </CardContent>
      </Card>
    </main>
  );
}
