import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, db: createServiceRoleClient(), error: "Unauthorized" as const };
  return { user, db: createServiceRoleClient(), error: null };
}

export async function requireVendor(userId: string) {
  const db = createServiceRoleClient();
  const { data: vendor } = await db
    .from("vendors")
    .select("id, user_id, business_name, business_logo, business_slug")
    .eq("user_id", userId)
    .maybeSingle();
  return { db, vendor };
}

export async function requireInfluencer(userId: string) {
  const db = createServiceRoleClient();
  const { data: influencer } = await db
    .from("influencers")
    .select("id, user_id, display_name, profile_image, niche, total_followers, is_verified")
    .eq("user_id", userId)
    .maybeSingle();
  return { db, influencer };
}

export async function isAdmin(userId: string) {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("is_active", true)
    .maybeSingle();
  return Boolean(data);
}
