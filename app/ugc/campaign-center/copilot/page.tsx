import { Suspense } from "react";
import { CampaignCopilotPage } from "@/components/ugc/enterprise/CampaignCopilotPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <CampaignCopilotPage />
    </Suspense>
  );
}
