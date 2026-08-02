import { Suspense } from "react";
import { UGCMatchesPage } from "@/components/ugc/workspace/UGCMatchesPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <UGCMatchesPage />
    </Suspense>
  );
}
