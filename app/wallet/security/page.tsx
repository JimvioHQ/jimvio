import type { Metadata } from "next";
import { WalletSecurityClient } from "@/components/wallet-os/WalletSecurityClient";

export const metadata: Metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default function WalletSecurityPage() {
  return <WalletSecurityClient />;
}
