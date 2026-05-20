import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { OrchestraAuthLayout } from "@/components/layout/orchestra-auth-layout";
import { clerkAuthPanelAppearance } from "@/lib/clerk-auth-appearance";

export default function SignInPage() {
  return (
    <OrchestraAuthLayout
      visualHeadline="Research-backed newsletters, without the grind."
      visualSubline="Plan topics, cite sources, draft, and polish—then send editions your readers trust."
      panelTitle="Welcome back"
      panelDescription="Sign in to open your studio and continue editing newsletters, topics, and drafts."
    >
      <Suspense fallback={<AuthFormFallback />}>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
          appearance={clerkAuthPanelAppearance}
        />
      </Suspense>
    </OrchestraAuthLayout>
  );
}
