import type { Metadata } from "next";
import { WalletAnalyticsClient } from "@/components/wallet-os/WalletAnalyticsClient";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default function WalletAnalyticsPage() {
  return <WalletAnalyticsClient />;
}
