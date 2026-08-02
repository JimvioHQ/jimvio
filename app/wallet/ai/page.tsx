import type { Metadata } from "next";
import { WalletAiClient } from "@/components/wallet-os/WalletAiClient";

export const metadata: Metadata = { title: "AI Assistant" };
export const dynamic = "force-dynamic";

export default function WalletAiPage() {
  return <WalletAiClient />;
}
