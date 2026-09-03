import { CampaignCenterBoard } from "@/components/ugc/campaign-center/CampaignCenterBoard";

export default function BrandCampaignsPage() {
  return (
    <CampaignCenterBoard
      title="My Campaigns"
      subtitle="Draft, fund, launch, and manage the campaigns you own."
      initialStatus="all"
    />
  );
}
