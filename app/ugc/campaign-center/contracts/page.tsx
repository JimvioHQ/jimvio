import { Suspense } from "react";
import { ContractsPage } from "@/components/ugc/enterprise/ContractsPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <ContractsPage />
    </Suspense>
  );
}
