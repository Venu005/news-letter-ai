import { SignUp } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        </CardContent>
      </Card>
    </main>
  );
}
