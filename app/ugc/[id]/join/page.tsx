import { redirect } from "next/navigation";
import { CampaignJoinFlow } from "@/components/ugc/join/CampaignJoinFlow";
import { loginUrlForReturnPath, ugcCampaignJoinPath } from "@/lib/ugc/join-auth";
import { getCachedUser } from "@/lib/supabase/server";

export default async function JoinCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect(loginUrlForReturnPath(ugcCampaignJoinPath(id)));
  }

  return <CampaignJoinFlow />;
}
