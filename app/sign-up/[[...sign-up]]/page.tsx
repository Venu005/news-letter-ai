import { SignUp } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-intel-gutter py-intel-stack-lg">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        </CardContent>
      </Card>
    </main>
  );
}
