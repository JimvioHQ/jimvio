/**
 * Normalize stored `vendors.payout_method` for UI and new writes.
 */
export function normalizeVendorPayoutMethod(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "mtn";
  return raw;
}
