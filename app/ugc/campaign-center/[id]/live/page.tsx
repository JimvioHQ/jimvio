import { Suspense } from "react";
import { CampaignLiveDashboard } from "@/components/ugc/enterprise/CampaignLiveDashboard";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <CampaignLiveDashboard campaignId={id} />
    </Suspense>
  );
}
