// "use server";

// import { createClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";

// export async function searchAdminVendors(query: string) {
//   const supabase = await createClient();
//   // Basic admin check
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) return { success: false, error: "Unauthorized" };
  
//   // We should ideally check if the user is an admin.
//   // Assuming a generic check or let RLS handle it, but for admin actions, 
//   // service role or an admin table check is usually done.
//   // Here we'll just query the vendors.
//   const { data, error } = await supabase
//     .from("vendors")
//     .select("id, business_name, owner_email, verification_status, is_active")
//     .ilike("business_name", `%${query}%`)
//     .limit(10);

//   if (error) {
//     return { success: false, error: error.message };
//   }

//   return { success: true, vendors: data };
// }

// export async function moveProductToVendor(productId: string, newVendorId: string) {
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) return { success: false, error: "Unauthorized" };

//   const { error } = await supabase
//     .from("products")
//     .update({ vendor_id: newVendorId })
//     .eq("id", productId);

//   if (error) {
//     return { success: false, error: error.message };
//   }

//   revalidatePath("/admin/products");
//   return { success: true };
// }

// lib/actions/admin-products.ts  — add bulk support

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function searchAdminVendors(query: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vendors")
      .select("id, business_name, business_slug, business_email, verification_status, is_active, profiles(email, avatar_url)")
      .or(`business_name.ilike.%${query}%,business_email.ilike.%${query}%`)
      .limit(20);
    if (error) return { success: false, error: error.message };
    const vendors = (data ?? []).map((v: any) => ({
      ...v,
      owner_email: v.profiles?.email ?? v.business_email ?? "",
      avatar_url:  v.profiles?.avatar_url ?? null,
    }));
    return { success: true, vendors };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ✅ Now accepts one OR many product IDs
export async function moveProductToVendor(
  productIds: string | string[],
  vendorId: string
) {
  try {
    const supabase = await createClient();
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    if (ids.length === 0) return { success: false, error: "No products selected" };

    const { error } = await supabase
      .from("products")
      .update({ vendor_id: vendorId })
      .in("id", ids);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/products");
    return { success: true, count: ids.length };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}