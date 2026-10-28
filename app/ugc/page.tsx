import { Suspense } from "react";
import { UGCDiscoverPage } from "@/components/ugc/workspace/UGCDiscoverPage";
import { loadPublicActiveCampaigns } from "@/lib/ugc/public-campaigns-server";

export const revalidate = 60;

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F3F4F6] border-t-[#FF5A1F]" />
    </div>
  );
}

export default async function UGCPage() {
  const { campaigns, total } = await loadPublicActiveCampaigns(24);
  return (
    <Suspense fallback={<PageFallback />}>
      <UGCDiscoverPage initialCampaigns={campaigns} initialTotal={total} />
    </Suspense>
  );
}
