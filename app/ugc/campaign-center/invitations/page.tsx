import { Suspense } from "react";
import { UGCInvitationsPage } from "@/components/ugc/workspace/UGCInvitationsPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <UGCInvitationsPage />
    </Suspense>
  );
}
