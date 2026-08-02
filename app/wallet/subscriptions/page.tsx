import type { Metadata } from "next";
import { WalletSubscriptionsClient } from "@/components/wallet-os/WalletSubscriptionsClient";

export const metadata: Metadata = { title: "Subscriptions" };
export const dynamic = "force-dynamic";

export default function WalletSubscriptionsPage() {
  return <WalletSubscriptionsClient />;
}
