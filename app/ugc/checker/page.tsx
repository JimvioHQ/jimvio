import { Suspense } from "react";
import { ViewCheckerPage } from "@/components/ugc/checker/ViewCheckerPage";

export const metadata = { title: "View Checker · Jimvio" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ViewCheckerPage />
    </Suspense>
  );
}
