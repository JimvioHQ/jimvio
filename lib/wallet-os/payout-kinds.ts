/**
 * The `payouts` table holds two different things:
 * - real withdrawals the person asked for (money leaving Jimvio), and
 * - internal earning holds (e.g. UGC earnings waiting for release), which are
 *   money coming IN and must never be shown or processed as a withdrawal.
 */
export const EARNING_HOLD_TYPES = ["ugc_earnings"] as const;

/** PostgREST filter: rows that are real withdrawals (type null counts as one). */
export const WITHDRAWALS_ONLY_FILTER = `type.is.null,type.not.in.(${EARNING_HOLD_TYPES.join(",")})`;

export function isEarningHold(type: string | null | undefined): boolean {
  return (EARNING_HOLD_TYPES as readonly string[]).includes(String(type ?? ""));
}
