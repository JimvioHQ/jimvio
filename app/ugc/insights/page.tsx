import { Suspense } from "react";
import { GlobalInsightsPage } from "@/components/ugc/enterprise/GlobalInsightsPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <GlobalInsightsPage />
    </Suspense>
  );
}
