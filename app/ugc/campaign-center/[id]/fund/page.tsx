import { Suspense } from "react";
import { CampaignFundClient } from "@/components/ugc/campaign-center/CampaignFundClient";

export default function CampaignFundPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg p-8 text-sm text-[#6B7280]">Loading funding…</div>}>
      <CampaignFundClient />
    </Suspense>
  );
}
