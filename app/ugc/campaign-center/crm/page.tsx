import { Suspense } from "react";
import { CreatorCrmPage } from "@/components/ugc/enterprise/CreatorCrmPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <CreatorCrmPage />
    </Suspense>
  );
}
