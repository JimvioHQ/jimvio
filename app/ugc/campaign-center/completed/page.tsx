import { CampaignCenterBoard } from "@/components/ugc/campaign-center/CampaignCenterBoard";

export default function CompletedCampaignsPage() {
  return (
    <CampaignCenterBoard
      title="Completed Campaigns"
      subtitle="Finished campaigns and their historical performance."
      initialStatus="completed"
    />
  );
}
