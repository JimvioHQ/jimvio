import { Suspense } from "react";
import { AutomationsPage } from "@/components/ugc/enterprise/AutomationsPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <AutomationsPage />
    </Suspense>
  );
}
