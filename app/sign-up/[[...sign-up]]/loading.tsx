import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { OrchestraAuthLayout } from "@/components/layout/orchestra-auth-layout";

export default function SignUpLoading() {
  return (
    <OrchestraAuthLayout
      visualHeadline="Start strong—your first issue begins here."
      visualSubline="Turn your niche into topics and drafts with Search, Writer, and Editor in one calm studio."
      panelTitle="Create your account"
      panelDescription="Newsletter builder with Search, Writer, and Editor in one workflow."
    >
      <AuthFormFallback />
    </OrchestraAuthLayout>
  );
}
