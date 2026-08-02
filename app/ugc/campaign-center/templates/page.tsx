import { Suspense } from "react";
import { UGCTemplatesPage } from "@/components/ugc/workspace/UGCTemplatesPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <UGCTemplatesPage />
    </Suspense>
  );
}
