import { Suspense } from "react";
import { UGCSavedCampaignsPage } from "@/components/ugc/workspace/UGCSavedCampaignsPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <UGCSavedCampaignsPage />
    </Suspense>
  );
}
