import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];

export type VendorLookupFailureReason =
  | "query_failed"
  | "permission_denied"
  | "network";

export type VendorLookupSuccess<T extends Partial<VendorRow>> = {
  ok: true;
  vendor: T | null;
  vendors: T[];
  /** Set when no vendor rows matched (not a query error). */
  notFound?: boolean;
  /** True when multiple vendor rows exist for the same user. */
  multipleMatches?: boolean;
};

export type VendorLookupError = {
  ok: false;
  error: string;
  code?: string;
  reason: VendorLookupFailureReason;
};

export type VendorLookupResult<T extends Partial<VendorRow>> =
  | VendorLookupSuccess<T>
  | VendorLookupError;

/** Serialize Postgrest errors for logs and toasts (avoids empty `{}` in console). */
export function formatSupabaseError(error: PostgrestError | null | undefined): string {
  if (!error) return "Unknown database error";
  const parts: string[] = [];
  if (error.code) parts.push(`[${error.code}]`);
  if (error.message) parts.push(error.message);
  if (error.details) parts.push(error.details);
  if (error.hint) parts.push(`Hint: ${error.hint}`);
  return parts.join(" — ") || "Unknown database error";
}

/** Prefer active vendors; otherwise most recently created. */
export function pickPrimaryVendor<T extends { is_active?: boolean | null; created_at?: string | null }>(
  vendors: T[]
): T | null {
  if (!vendors.length) return null;
  const active = vendors.filter((v) => v.is_active !== false);
  const pool = active.length > 0 ? active : vendors;
  return [...pool].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  })[0];
}

function classifyLookupFailure(error: PostgrestError): VendorLookupFailureReason {
  if (
    error.code === "42501" ||
    /permission denied|row-level security|rls/i.test(error.message ?? "")
  ) {
    return "permission_denied";
  }
  if (/fetch|network|timeout|failed to fetch/i.test(error.message ?? "")) {
    return "network";
  }
  return "query_failed";
}

export function vendorLookupToastMessage(result: VendorLookupError): string {
  switch (result.reason) {
    case "permission_denied":
      return "Permission denied loading your vendor profile. Check database access policies.";
    case "network":
      return "Network error loading vendor profile. Check your connection and try again.";
    default:
      return `Vendor profile lookup failed: ${result.error}`;
  }
}

/**
 * Load all vendor rows for a user (array query — never fails on duplicate rows).
 * Use instead of `.maybeSingle()` / `.single()` on `vendors` filtered by `user_id`.
 */
export async function lookupVendorsByUserId<T extends string = "*">(
  supabase: SupabaseClient<Database>,
  userId: string,
  select: T = "*" as T
): Promise<VendorLookupResult<Pick<VendorRow, T extends keyof VendorRow ? T : keyof VendorRow>>> {
  const { data, error } = await supabase
    .from("vendors")
    .select(select)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error: formatSupabaseError(error),
      code: error.code,
      reason: classifyLookupFailure(error),
    };
  }

  const vendors = (data ?? []) as Pick<VendorRow, T extends keyof VendorRow ? T : keyof VendorRow>[];
  const vendor = pickPrimaryVendor(vendors);

  if (!vendor) {
    return {
      ok: true,
      vendor: null,
      vendors: [],
      notFound: true,
    };
  }

  return {
    ok: true,
    vendor,
    vendors,
    multipleMatches: vendors.length > 1,
  };
}
