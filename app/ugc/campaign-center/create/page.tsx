import { Suspense } from "react";
import { CampaignCreateWizard } from "@/components/ugc/campaign-center/CampaignCreateWizard";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function CreateCampaignPage() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <CampaignCreateWizard />
    </Suspense>
  );
}
