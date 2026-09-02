import type { Metadata } from "next";
import { walletFontVariables } from "./fonts";
import { WalletOsShell } from "@/components/wallet-os/WalletOsShell";

export const metadata: Metadata = {
  title: {
    template: "%s · Jimvio Wallet",
    default: "Jimvio Wallet",
  },
  description: "Manage your Jimvio balance, transactions, withdrawals, and deposits.",
};

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={walletFontVariables}>
      <WalletOsShell>{children}</WalletOsShell>
    </div>
  );
}
