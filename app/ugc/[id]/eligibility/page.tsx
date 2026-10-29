import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { loginUrlForReturnPath } from "@/lib/ugc/join-auth";
import { CampaignEligibilityView } from "@/components/ugc/join/CampaignEligibilityView";

export default async function CampaignEligibilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const {
    data: { user },
  } = await getCachedUser();
  if (!user) redirect(loginUrlForReturnPath(`/ugc/${id}/eligibility`));
  return <CampaignEligibilityView campaignId={id} />;
}
