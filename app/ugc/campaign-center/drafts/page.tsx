import { CampaignCenterBoard } from "@/components/ugc/campaign-center/CampaignCenterBoard";

export default function DraftsPage() {
  return (
    <CampaignCenterBoard
      title="Drafts"
      subtitle="Unpublished campaigns. Continue editing or publish when ready."
      initialStatus="draft"
    />
  );
}
