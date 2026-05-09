import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { OrchestraAuthLayout } from "@/components/layout/orchestra-auth-layout";

export default function SignInLoading() {
  return (
    <OrchestraAuthLayout
      visualHeadline="Research-backed newsletters, without the grind."
      visualSubline="Plan topics, cite sources, draft, and polish—then send editions your readers trust."
      panelTitle="Welcome back"
      panelDescription="Sign in to open your studio and continue editing newsletters, topics, and drafts."
    >
      <AuthFormFallback />
    </OrchestraAuthLayout>
  );
}
