import type { Metadata } from "next";
import { walletFontVariables } from "./fonts";
import { WalletOsShell } from "@/components/wallet-os/WalletOsShell";

export const metadata: Metadata = {
  title: {
    template: "%s · Jimvio Wallet OS",
    default: "Jimvio Wallet OS",
  },
  description: "One operating system for everything you earn, hold, and move on Jimvio.",
};

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={walletFontVariables}>
      <WalletOsShell>{children}</WalletOsShell>
    </div>
  );
}
