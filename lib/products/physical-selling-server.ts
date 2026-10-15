import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function markPhysicalSellingRequested(userId: string) {
  const admin = createServiceRoleClient() as any;
  const { data: vendor } = await admin
    .from("vendors")
    .select("id, verification_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (!vendor || vendor.verification_status === "verified" || vendor.verification_status === "approved") {
    return;
  }
  await admin
    .from("vendors")
    .update({
      physical_selling_requested_at: new Date().toISOString(),
      verification_status:
        vendor.verification_status === "suspended" ? "suspended" : vendor.verification_status || "pending",
    })
    .eq("id", vendor.id);
}
