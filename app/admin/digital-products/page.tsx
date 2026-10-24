import { DigitalReviewWorkspace } from "@/components/admin/digital-products/review-workspace";
import { listCustomerIssues, listDigitalReviewQueue } from "@/lib/digital-products/trust/service";

export const dynamic = "force-dynamic";

export default async function DigitalProductsReviewPage() {
  const queue = await listDigitalReviewQueue({ state: "under_review", page: 1 }).catch(() => ({
    rows: [],
    total: 0,
    error: "The review queue could not be loaded.",
  }));
  const issues = await listCustomerIssues(30).catch(() => []);
  return (
    <DigitalReviewWorkspace
      initialRows={queue.rows}
      initialTotal={queue.total}
      initialError={queue.error}
      initialIssues={issues}
    />
  );
}
