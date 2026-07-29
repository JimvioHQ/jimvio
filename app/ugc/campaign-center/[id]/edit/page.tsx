import { CampaignCreateWizard } from "@/components/ugc/campaign-center/CampaignCreateWizard";
import CampaignManagementClient from "@/components/ugc/campaign-center/CampaignManagementClient";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6 pb-10">
      <CampaignManagementClient campaignId={id} />
      <CampaignCreateWizard editId={id} />
    </div>
  );
}
