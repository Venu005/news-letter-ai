import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { OrchestraAuthLayout } from "@/components/layout/orchestra-auth-layout";

export default function SignUpLoading() {
  return (
    <OrchestraAuthLayout
      visualHeadline="Research-backed newsletters, without the grind."
      visualDescription="Plan topics, cite sources, draft, and polish—then send editions your readers trust."
      panelTitle="Create your account"
      panelDescription="Newsletter builder with Search, Writer, and Editor in one workflow."
    >
      <AuthFormFallback />
    </OrchestraAuthLayout>
  );
}
