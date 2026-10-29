import { Suspense } from "react";
import { SubmissionReviewPage } from "@/components/ugc/checker/SubmissionReviewPage";

export const metadata = { title: "Submission Review · Jimvio" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SubmissionReviewPage />
    </Suspense>
  );
}
