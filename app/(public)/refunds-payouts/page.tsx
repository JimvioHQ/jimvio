import type { Metadata } from "next";
import { RefundsDocument } from "@/components/legal";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Refunds & Disputes",
  description:
    "Jimvio refund windows, seller and creator payout rules, and chargeback handling.",
  path: "/refunds-payouts",
});

export default function RefundsPayoutsPage() {
  return <RefundsDocument />;
}
