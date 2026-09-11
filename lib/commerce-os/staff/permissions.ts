import type { SupabaseClient } from "@supabase/supabase-js";
import { cosTable } from "../db";

export type StoreStaffRole =
  | "owner"
  | "admin"
  | "manager"
  | "support"
  | "fulfillment"
  | "marketing"
  | "analyst";

const ROLE_PERMS: Record<StoreStaffRole, string[]> = {
  owner: ["*"],
  admin: [
    "products",
    "orders",
    "customers",
    "analytics",
    "marketing",
    "payments",
    "shipping",
    "fulfillment",
    "settings",
  ],
  manager: ["products", "orders", "customers", "analytics", "shipping", "fulfillment"],
  support: ["orders", "customers"],
  fulfillment: ["orders", "fulfillment", "shipping"],
  marketing: ["products", "marketing", "analytics", "customers"],
  analyst: ["analytics"],
};

export function roleAllows(role: string, permission: string): boolean {
  const perms = ROLE_PERMS[role as StoreStaffRole];
  if (!perms) return false;
  return perms.includes("*") || perms.includes(permission);
}

/**
 * Server-side staff permission check. Vendor owners always pass.
 * UI hiding alone is not security — call this on mutating routes.
 */
export async function assertStorePermission(
  db: SupabaseClient,
  input: {
    storeId: string;
    vendorId: string;
    userId: string;
    permission: string;
  }
): Promise<{ ok: true; role: string } | { ok: false; error: string }> {
  const { data: store } = await cosTable(db, "jimvio_stores")
    .select("id, vendor_id")
    .eq("id", input.storeId)
    .eq("vendor_id", input.vendorId)
    .maybeSingle();
  if (!store) return { ok: false, error: "Store not found." };

  const { data: staff } = await cosTable(db, "jimvio_store_staff")
    .select("role, permissions, accepted_at")
    .eq("store_id", input.storeId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!staff) {
    // Vendor owner without staff row still has access
    return { ok: true, role: "owner" };
  }

  if (!staff.accepted_at && staff.role !== "owner") {
    return { ok: false, error: "Staff invitation has not been accepted." };
  }

  const custom = (staff.permissions as string[]) || [];
  if (custom.length && custom.includes(input.permission)) {
    return { ok: true, role: staff.role };
  }
  if (!roleAllows(staff.role, input.permission)) {
    return {
      ok: false,
      error: `Your role (${staff.role}) cannot perform: ${input.permission}.`,
    };
  }
  return { ok: true, role: staff.role };
}
