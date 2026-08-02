import { Suspense } from "react";
import { ReferralsPage } from "@/components/ugc/enterprise/ReferralsPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <ReferralsPage />
    </Suspense>
  );
}
