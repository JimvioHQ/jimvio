import { CampaignCenterBoard } from "@/components/ugc/campaign-center/CampaignCenterBoard";

export default function ActiveCampaignsPage() {
  return (
    <CampaignCenterBoard
      title="Active Campaigns"
      subtitle="Live campaigns accepting creators and submissions."
      initialStatus="active"
    />
  );
}
