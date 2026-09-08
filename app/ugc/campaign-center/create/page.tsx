import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CampaignCreateWizard } from "@/components/ugc/campaign-center/CampaignCreateWizard";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";
import { loginUrlForReturnPath } from "@/lib/ugc/join-auth";
import { getCachedUser } from "@/lib/supabase/server";

export default async function CreateCampaignPage() {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect(loginUrlForReturnPath("/ugc/campaign-center/create"));
  }

  return (
    <Suspense fallback={<UGCPageFallback />}>
      <CampaignCreateWizard />
    </Suspense>
  );
}
