import { Suspense } from "react";
import { UGCGlobalSearchPage } from "@/components/ugc/workspace/UGCGlobalSearchPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <UGCGlobalSearchPage />
    </Suspense>
  );
}
