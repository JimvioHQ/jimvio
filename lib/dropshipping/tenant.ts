import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureSellerVendor } from "@/lib/actions/seller-products";

export async function requireDropshippingMerchant(): Promise<
  | { ok: true; userId: string; vendorId: string }
  | { ok: false; status: 401 | 403; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Authentication required." };

  const vendor = await ensureSellerVendor(user.id);
  if (!vendor?.id) {
    return { ok: false, status: 403, error: "Seller account required for Dropshipping OS." };
  }
  return { ok: true, userId: user.id, vendorId: vendor.id };
}

export function dsAdminDb() {
  return createServiceRoleClient();
}
