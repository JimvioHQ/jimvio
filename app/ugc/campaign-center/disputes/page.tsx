import { Suspense } from "react";
import { DisputesPage } from "@/components/ugc/enterprise/DisputesPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <DisputesPage />
    </Suspense>
  );
}
