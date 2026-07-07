import { SUPER_APP_MESSAGE_SCAFFOLD } from "./config";
import type { JimvioSuperAppData } from "./types";

export type SuperAppAdapterInput = {
  availableBalance?: number;
  pendingBalance?: number;
  affiliateEarnings?: number;
  creatorEarnings?: number;
  refunds?: number;
  unreadMessages?: number;
  unreadNotifications?: number;
  formatMoney?: (amount: number, currency?: string) => string;
};

export function createSuperAppData(input: SuperAppAdapterInput = {}): JimvioSuperAppData {
  const fmt = input.formatMoney ?? ((n: number) => `$${n.toFixed(2)}`);

  return {
    wallet: {
      availableBalance: fmt(input.availableBalance ?? 0),
      pendingBalance: fmt(input.pendingBalance ?? 0),
      affiliateEarnings: fmt(input.affiliateEarnings ?? 0),
      creatorEarnings: fmt(input.creatorEarnings ?? 0),
      refunds: fmt(input.refunds ?? 0),
      currency: "USD",
    },
    transactions: [
      { id: "tx-1", label: "Affiliate commission", amount: `+${fmt(24.5)}`, time: "Today", type: "credit" },
      { id: "tx-2", label: "Product sale", amount: `+${fmt(89)}`, time: "Yesterday", type: "credit" },
      { id: "tx-3", label: "Payout processing", amount: fmt(-120), time: "2d ago", type: "pending" },
      { id: "tx-4", label: "Refund issued", amount: fmt(-15), time: "3d ago", type: "debit" },
    ],
    payouts: [
      { id: "po-1", label: "Weekly payout", amount: fmt(340), time: "Mar 28", type: "credit" },
      { id: "po-2", label: "Affiliate withdrawal", amount: fmt(85), time: "Mar 21", type: "credit" },
    ],
    messageChannels: SUPER_APP_MESSAGE_SCAFFOLD,
    unreadMessages: input.unreadMessages ?? 2,
    unreadNotifications: input.unreadNotifications ?? 3,
  };
}
