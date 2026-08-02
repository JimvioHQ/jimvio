import { Suspense } from "react";
import { BrandTeamPage } from "@/components/ugc/enterprise/BrandTeamPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <BrandTeamPage />
    </Suspense>
  );
}
