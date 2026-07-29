import { CampaignCreateWizard } from "@/components/ugc/campaign-center/CampaignCreateWizard";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignCreateWizard editId={id} />;
}
