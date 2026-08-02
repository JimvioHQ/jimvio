import { Suspense } from "react";
import { UGCFavoriteCreatorsPage } from "@/components/ugc/workspace/UGCFavoriteCreatorsPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <UGCFavoriteCreatorsPage />
    </Suspense>
  );
}
