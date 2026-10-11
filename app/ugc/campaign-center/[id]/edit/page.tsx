import { redirect } from "next/navigation";
import { CampaignCreateWizard } from "@/components/ugc/campaign-center/CampaignCreateWizard";
import CampaignManagementClient from "@/components/ugc/campaign-center/CampaignManagementClient";
import { loginUrlForReturnPath } from "@/lib/ugc/join-auth";
import { getCachedUser } from "@/lib/supabase/server";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const {
    data: { user },
  } = await getCachedUser();
  if (!user) {
    redirect(loginUrlForReturnPath(`/ugc/campaign-center/${id}/edit`));
  }
  return (
    <div className="space-y-6 pb-10">
      <CampaignManagementClient campaignId={id} />
      <CampaignCreateWizard editId={id} />
    </div>
  );
}
