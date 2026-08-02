import type { Metadata } from "next";
import { WalletDepositsClient } from "@/components/wallet-os/WalletDepositsClient";

export const metadata: Metadata = { title: "Deposits" };
export const dynamic = "force-dynamic";

export default function WalletDepositsPage() {
  return <WalletDepositsClient />;
}
