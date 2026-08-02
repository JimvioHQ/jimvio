import { Suspense } from "react";
import { UGCCalendarPage } from "@/components/ugc/workspace/UGCCalendarPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <UGCCalendarPage />
    </Suspense>
  );
}
