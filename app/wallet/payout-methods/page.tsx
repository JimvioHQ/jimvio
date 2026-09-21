import type { Metadata } from "next";
import { WalletPayoutMethodsClient } from "@/components/wallet-os/WalletPayoutMethodsClient";

export const metadata: Metadata = { title: "Payout methods" };
export const dynamic = "force-dynamic";

export default function WalletPayoutMethodsPage() {
  return <WalletPayoutMethodsClient />;
}
