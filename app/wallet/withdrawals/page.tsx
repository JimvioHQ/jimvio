import type { Metadata } from "next";
import { WalletWithdrawalsClient } from "@/components/wallet-os/WalletWithdrawalsClient";

export const metadata: Metadata = { title: "Withdrawals" };
export const dynamic = "force-dynamic";

export default function WalletWithdrawalsPage() {
  return <WalletWithdrawalsClient />;
}
