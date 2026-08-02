import type { Metadata } from "next";
import { WalletOverviewClient } from "@/components/wallet-os/WalletOverviewClient";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default function WalletOverviewPage() {
  return <WalletOverviewClient />;
}
