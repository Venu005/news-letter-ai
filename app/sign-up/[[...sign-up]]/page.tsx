import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { OrchestraAuthLayout } from "@/components/layout/orchestra-auth-layout";
import { clerkAuthPanelAppearance } from "@/lib/clerk-auth-appearance";

export default function SignUpPage() {
  return (
    <OrchestraAuthLayout
      visualHeadline="Start strong—your first issue begins here."
      visualSubline="Turn your niche into topics and drafts with Search, Writer, and Editor in one calm studio."
      panelTitle="Create your account"
      panelDescription="Newsletter builder with Search, Writer, and Editor in one workflow."
    >
      <Suspense fallback={<AuthFormFallback />}>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/dashboard"
          signInForceRedirectUrl="/dashboard"
          appearance={clerkAuthPanelAppearance}
        />
      </Suspense>
    </OrchestraAuthLayout>
  );
}
