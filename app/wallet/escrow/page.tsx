import type { Metadata } from "next";
import { WalletEscrowClient } from "@/components/wallet-os/WalletEscrowClient";

export const metadata: Metadata = { title: "Escrow" };
export const dynamic = "force-dynamic";

export default function WalletEscrowPage() {
  return <WalletEscrowClient />;
}
