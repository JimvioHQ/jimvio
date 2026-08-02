import { Suspense } from "react";
import { UGCAchievementsPage } from "@/components/ugc/workspace/UGCAchievementsPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <UGCAchievementsPage />
    </Suspense>
  );
}
