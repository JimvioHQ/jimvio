import { Suspense } from "react";
import { WebhooksPage } from "@/components/ugc/enterprise/WebhooksPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <WebhooksPage />
    </Suspense>
  );
}
