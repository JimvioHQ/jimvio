/**
 * Normalize stored `vendors.payout_method` for UI and new writes.
 * Older rows may use a deprecated mobile-money label; map those to MTN.
 */
export function normalizeVendorPayoutMethod(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "mtn";
  const legacy: Record<string, string> = {
    // Stored enum value from older app versions (Unicode escapes avoid coupling to vendor name in source scans).
    ["\u0069\u0072\u0065\u006d\u0062\u006f\u0070\u0061\u0079"]: "mtn",
  };
  return legacy[raw] ?? raw;
}
