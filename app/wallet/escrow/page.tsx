import type { Metadata } from "next";
import { WalletEscrowClient } from "@/components/wallet-os/WalletEscrowClient";

export const metadata: Metadata = { title: "Reserved funds" };
export const dynamic = "force-dynamic";

export default function WalletEscrowPage() {
  return <WalletEscrowClient />;
}
