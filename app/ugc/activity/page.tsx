import { Suspense } from "react";
import { UGCActivityPage } from "@/components/ugc/workspace/UGCActivityPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <UGCActivityPage />
    </Suspense>
  );
}
