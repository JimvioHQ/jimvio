import { Suspense } from "react";
import { UGCLibraryPage } from "@/components/ugc/workspace/UGCLibraryPage";
import { UGCPageFallback } from "@/components/ugc/workspace/ugc-page-fallback";

export default function Page() {
  return (
    <Suspense fallback={<UGCPageFallback />}>
      <UGCLibraryPage />
    </Suspense>
  );
}
