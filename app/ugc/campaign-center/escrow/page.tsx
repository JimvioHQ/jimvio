import { Suspense } from "react";
import { EscrowDashboardPage } from "@/components/ugc/enterprise/EscrowDashboardPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <EscrowDashboardPage />
    </Suspense>
  );
}
