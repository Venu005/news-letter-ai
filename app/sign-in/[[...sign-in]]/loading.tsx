import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { OrchestraAuthLayout } from "@/components/layout/orchestra-auth-layout";

export default function SignInLoading() {
  return (
    <OrchestraAuthLayout
      visualHeadline="Pick up right where you left off."
      visualDescription="Your newsletters, topics, and drafts—ready in the studio when you are."
      panelTitle="Welcome back"
      panelDescription="Sign in to open your studio and continue editing newsletters, topics, and drafts."
    >
      <AuthFormFallback />
    </OrchestraAuthLayout>
  );
}
