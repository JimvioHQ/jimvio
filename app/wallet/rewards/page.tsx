import type { Metadata } from "next";
import { WalletRewardsClient } from "@/components/wallet-os/WalletRewardsClient";

export const metadata: Metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

export default function WalletRewardsPage() {
  return <WalletRewardsClient />;
}
