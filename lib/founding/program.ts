/**
 * N-7: Founding Creators program — single source of truth for its rules.
 * The page, the badge and the payment finalizer all read from here.
 */
export const FOUNDING_SEATS = 100;
export const FOUNDING_FEE_RATE = 10; // % on community memberships
export const FOUNDING_FEE_MONTHS = 12;

export type FoundingSeat = {
  user_id: string;
  seat_number: number;
  qualified_by: "community" | "creator_profile" | "store";
  fee_rate: number | string;
  fee_until: string;
  joined_at: string;
};

/** Platform fee for a community payment, applying the founding rate while it lasts. */
export function communityFeeRate(
  standardRate: number,
  seat: Pick<FoundingSeat, "fee_rate" | "fee_until"> | null | undefined,
  now: Date = new Date(),
): number {
  if (!seat) return standardRate;
  if (new Date(seat.fee_until).getTime() <= now.getTime()) return standardRate;
  const founding = Number(seat.fee_rate);
  return Number.isFinite(founding) ? Math.min(standardRate, founding) : standardRate;
}

export function seatLabel(n: number): string {
  return `Founding Creator #${String(n).padStart(3, "0")}`;
}

export const CLAIM_ERRORS: Record<string, string> = {
  not_signed_in: "Sign in to claim your seat.",
  account_inactive: "This account can't claim a seat.",
  not_eligible:
    "Seats are for creators already building on Jimvio. Start a community, set up your creator profile, or publish a product — then come back.",
  program_full: "All 100 founding seats have been claimed.",
};
