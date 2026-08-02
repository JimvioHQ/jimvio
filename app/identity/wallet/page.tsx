import type { Metadata } from "next";
import { IdentityWalletClient } from "@/components/identity/IdentityWalletClient";

export const metadata: Metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";

export default function IdentityWalletPage() {
  return <IdentityWalletClient />;
}
