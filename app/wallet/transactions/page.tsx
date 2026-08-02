import type { Metadata } from "next";
import { WalletLedgerClient } from "@/components/wallet-os/WalletLedgerClient";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

export default function WalletTransactionsPage() {
  return <WalletLedgerClient />;
}
