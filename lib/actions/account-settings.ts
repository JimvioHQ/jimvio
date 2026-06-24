"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/security";

export type VendorPolicies = {
  shipping_policy: string;
  return_policy: string;
};

export async function requestEmailChange(newEmail: string): Promise<ActionResult<{ message: string }>> {
  const email = newEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  if (email === (user.email ?? "").toLowerCase()) {
    return { success: false, error: "That is already your email address." };
  }

  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/security");
  revalidatePath("/admin/settings/profile");
  return {
    success: true,
    data: { message: "Check your inbox to confirm the new email address." },
  };
}

export async function exportUserData(): Promise<ActionResult<{ json: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const [profileRes, vendorRes, affiliateRes, influencerRes, rolesRes, ordersRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("vendors").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("influencers").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role, is_active").eq("user_id", user.id),
      supabase
        .from("orders")
        .select("id, order_number, status, payment_status, total_amount, currency, created_at")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      notification_preferences: user.user_metadata?.notification_preferences ?? null,
      vendor_policies: user.user_metadata?.vendor_policies ?? null,
      preferred_currency: user.user_metadata?.preferred_currency ?? null,
    },
    profile: profileRes.data,
    vendor: vendorRes.data,
    affiliate: affiliateRes.data,
    influencer: influencerRes.data,
    roles: rolesRes.data ?? [],
    recent_orders: ordersRes.data ?? [],
  };

  return { success: true, data: { json: JSON.stringify(payload, null, 2) } };
}

export async function deactivateAccount(): Promise<ActionResult<{ message: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (profileError) return { success: false, error: profileError.message };

  await supabase
    .from("user_roles")
    .update({ is_active: false })
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  return {
    success: true,
    data: { message: "Your account has been deactivated. Contact support to restore access." },
  };
}

export async function saveUserPreferences(input: {
  language: string;
  timezone: string;
  preferred_currency: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      language: input.language.trim() || "en",
      timezone: input.timezone.trim() || "Africa/Kigali",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profileError) return { success: false, error: profileError.message };

  const { error: metaError } = await supabase.auth.updateUser({
    data: { preferred_currency: input.preferred_currency.trim() || "USD" },
  });
  if (metaError) return { success: false, error: metaError.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function saveVendorPolicies(policies: VendorPolicies): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase.auth.updateUser({
    data: {
      vendor_policies: {
        shipping_policy: policies.shipping_policy.trim(),
        return_policy: policies.return_policy.trim(),
      },
    },
  });
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function saveAffiliateSettings(input: {
  bio: string;
  website: string;
  payout_method: string;
  payout_account: string;
  niche: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const niche = input.niche
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { data: row } = await supabase
    .from("affiliates")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) {
    return { success: false, error: "Activate the affiliate role first." };
  }

  const { error } = await supabase
    .from("affiliates")
    .update({
      bio: input.bio.trim() || null,
      website: input.website.trim() || null,
      payout_method: input.payout_method,
      payout_account: input.payout_account.trim(),
      niche: niche.length > 0 ? niche : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function saveInfluencerSettings(input: {
  display_name: string;
  bio: string;
  niche: string;
  social_platforms: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: row } = await supabase
    .from("influencers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) {
    return { success: false, error: "Activate the creator role first." };
  }

  let social_platforms: Record<string, string> | null = null;
  const raw = input.social_platforms.trim();
  if (raw) {
    try {
      social_platforms = JSON.parse(raw) as Record<string, string>;
    } catch {
      return { success: false, error: "Social platforms must be valid JSON, e.g. {\"instagram\":\"@handle\"}" };
    }
  }

  const niche = input.niche
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("influencers")
    .update({
      display_name: input.display_name.trim() || "Creator",
      bio: input.bio.trim() || null,
      niche: niche.length > 0 ? niche : null,
      social_platforms,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function activateUserRole(
  role: "affiliate" | "influencer"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  if (role === "affiliate") {
    const { data: existing } = await supabase
      .from("affiliates")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("affiliates").insert({ user_id: user.id });
      if (error) return { success: false, error: error.message };
    }
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    const { data: existing } = await supabase
      .from("influencers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("influencers").insert({
        user_id: user.id,
        display_name: profile?.full_name?.trim() || "Creator",
      });
      if (error) return { success: false, error: error.message };
    }
  }

  const { error: roleError } = await supabase.from("user_roles").upsert(
    { user_id: user.id, role, is_active: true },
    { onConflict: "user_id,role" }
  );
  if (roleError) return { success: false, error: roleError.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}
