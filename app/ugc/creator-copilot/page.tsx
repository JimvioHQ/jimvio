import { Suspense } from "react";
import { CreatorCopilotPage } from "@/components/ugc/enterprise/CreatorCopilotPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <CreatorCopilotPage />
    </Suspense>
  );
}
