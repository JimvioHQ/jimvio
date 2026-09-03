import { Suspense } from "react";
import { UGCMyCampaignsPage } from "@/components/ugc/workspace/UGCMyCampaignsPage";

function Fallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F3F4F6] border-t-[#FF5A1F]" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <UGCMyCampaignsPage />
    </Suspense>
  );
}
