import type { Metadata } from "next";
import { WalletInvoicesClient } from "@/components/wallet-os/WalletInvoicesClient";

export const metadata: Metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default function WalletInvoicesPage() {
  return <WalletInvoicesClient />;
}
