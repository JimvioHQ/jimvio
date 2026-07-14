import { Suspense } from "react";
import { UGCBrandDealsPage } from "@/components/ugc/workspace/UGCBrandDealsPage";

function Fallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F3F4F6] border-t-[var(--color-accent)]" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <UGCBrandDealsPage />
    </Suspense>
  );
}
