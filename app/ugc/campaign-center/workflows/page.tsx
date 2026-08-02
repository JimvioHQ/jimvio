import { Suspense } from "react";
import { WorkflowBuilderPage } from "@/components/ugc/enterprise/WorkflowBuilderPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <WorkflowBuilderPage />
    </Suspense>
  );
}
