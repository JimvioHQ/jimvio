import { create } from "zustand";
import { getNavbarCounts } from "@/lib/actions/marketplace";

const COOLDOWN_MS = 30_000;
let lastFetchAt = 0;
let fetchInFlight: Promise<void> | null = null;

interface HeaderAccountState {
  /** Canonical Jimvio Total Balance (Wallet OS netWorth). */
  walletBalance: number;
  /** Canonical reward points (`jip_identity.xp`) — not USD. */
  rewardsBalance: number;
  notificationCount: number;
  currency: string;
  /** True after at least one successful hydrate attempt for an authenticated session. */
  hydrated: boolean;
  refreshAccountSummary: () => Promise<void>;
  reset: () => void;
}

/**
 * Non-blocking total-balance + reward-points + notification summary for header / profile.
 * Never gate chrome on this store — values hydrate independently.
 */
export const useHeaderAccountStore = create<HeaderAccountState>((set) => ({
  walletBalance: 0,
  rewardsBalance: 0,
  notificationCount: 0,
  currency: "USD",
  hydrated: false,

  refreshAccountSummary: async () => {
    const now = Date.now();
    if (lastFetchAt > 0 && now - lastFetchAt < COOLDOWN_MS) {
      return;
    }
    if (fetchInFlight) {
      return fetchInFlight;
    }

    fetchInFlight = (async () => {
      try {
        const counts = await getNavbarCounts();
        lastFetchAt = Date.now();
        set({
          walletBalance: Number(counts.walletBalance ?? 0),
          rewardsBalance: Number(counts.rewardsBalance ?? 0),
          notificationCount: Number(counts.notificationCount ?? 0),
          currency: counts.walletCurrency ?? "USD",
          hydrated: true,
        });
      } catch (err) {
        console.error("[HeaderAccountStore] refresh failed:", err);
        set({ hydrated: true });
      } finally {
        fetchInFlight = null;
      }
    })();

    return fetchInFlight;
  },

  reset: () => {
    lastFetchAt = 0;
    set({
      walletBalance: 0,
      rewardsBalance: 0,
      notificationCount: 0,
      currency: "USD",
      hydrated: false,
    });
  },
}));
