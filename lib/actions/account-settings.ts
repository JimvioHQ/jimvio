"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionOwnNonPrivilegedRole } from "@/lib/auth/provision-nonprivileged-role";
import type { ActionResult } from "@/lib/actions/security";
import { isValidAuthEmail, mapEmailChangeError, normalizeSignInEmail } from "@/lib/auth/sign-in-errors";
import { cookies } from "next/headers";
import { getPublicAppUrl } from "@/lib/app-url";
import { buildAuthCallbackUrl } from "@/lib/auth/callback-origin";
import { UGC_LOCALE_COOKIE } from "@/lib/ugc/i18n/messages";
import {
  isSettingsLanguage,
  isValidTimeZone,
  toUgcLocale,
} from "@/lib/settings/preferences";

export type VendorPolicies = {
  shipping_policy: string;
  return_policy: string;
};

export async function requestEmailChange(
  newEmail: string,
  currentPassword?: string,
): Promise<ActionResult<{ message: string }>> {
  const email = normalizeSignInEmail(newEmail);
  if (!isValidAuthEmail(email)) {
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

  const providers = (user.identities ?? []).map((identity) => identity.provider);
  const hasPassword = providers.includes("email");

  // Password users must re-authenticate before email change (stolen-session defense).
  // OAuth-only users rely on Supabase secure email-change confirmation emails.
  if (hasPassword) {
    if (!currentPassword?.trim()) {
      return { success: false, error: "Current password is required to change email." };
    }
    if (!user.email) {
      return { success: false, error: "Account email required to change email." };
    }
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyErr) {
      return { success: false, error: "Current password is incorrect." };
    }
  }

  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: buildAuthCallbackUrl(await getPublicAppUrl(), "/settings/account") },
  );
  if (error) return { success: false, error: mapEmailChangeError(error) };

  revalidatePath("/identity/settings");
  revalidatePath("/identity/security");
  revalidatePath("/settings/account");
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
      supabase.rpc("get_my_private_profile").maybeSingle(),
      supabase.rpc("get_my_vendors"),
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
    vendor: vendorRes.data?.find((row) => row.is_active !== false) ?? vendorRes.data?.[0] ?? null,
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

  const admin = createAdminClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (profileError) return { success: false, error: profileError.message };
  await admin
    .from("user_roles")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .neq("role", "admin");

  revalidatePath("/");
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

  const language = input.language.trim().toLowerCase();
  if (!isSettingsLanguage(language)) {
    return { success: false, error: "Choose a language Jimvio currently supports." };
  }
  const timezone = input.timezone.trim() || "UTC";
  if (!isValidTimeZone(timezone)) {
    return { success: false, error: "Choose a valid timezone." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      language,
      timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profileError) return { success: false, error: profileError.message };

  const { error: metaError } = await supabase.auth.updateUser({
    data: { preferred_currency: "USD" },
  });
  if (metaError) return { success: false, error: metaError.message };

  const jar = await cookies();
  jar.set(UGC_LOCALE_COOKIE, toUgcLocale(language), {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });

  revalidatePath("/identity/settings");
  revalidatePath("/settings/language");
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

  revalidatePath("/identity/settings");
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
  revalidatePath("/identity/settings");
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
  revalidatePath("/identity/settings");
  return { success: true };
}

export async function activateUserRole(
  role: "affiliate" | "influencer"
): Promise<ActionResult<{ affiliateCode?: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  if (!user.email_confirmed_at) {
    return {
      success: false,
      error: "Verify your email before activating this role.",
    };
  }

  if (role === "affiliate") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return {
        success: false,
        error: "Complete your Jimvio profile before activating affiliate access.",
      };
    }

    const { data: existing } = await supabase
      .from("affiliates")
      .select("id, is_active, affiliate_code")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { data: created, error } = await supabase
        .from("affiliates")
        .insert({
          user_id: user.id,
          is_active: true,
        })
        .select("id, affiliate_code, is_active")
        .single();
      if (error || !created?.is_active) {
        // Fallback: service-role upsert if RLS/session insert fails unexpectedly
        const admin = createAdminClient();
        const { data: upserted, error: upsertError } = await admin
          .from("affiliates")
          .upsert(
            { user_id: user.id, is_active: true },
            { onConflict: "user_id" }
          )
          .select("id, affiliate_code, is_active")
          .single();
        if (upsertError || !upserted?.is_active) {
          return {
            success: false,
            error: "Could not activate affiliate access. Please try again.",
          };
        }
      }
    } else if (!existing.is_active) {
      const { error } = await supabase
        .from("affiliates")
        .update({ is_active: true })
        .eq("id", existing.id)
        .eq("user_id", user.id);
      if (error) {
        const admin = createAdminClient();
        const { error: adminError } = await admin
          .from("affiliates")
          .update({ is_active: true })
          .eq("id", existing.id)
          .eq("user_id", user.id);
        if (adminError) {
          return {
            success: false,
            error: "Could not reactivate affiliate access. Please try again.",
          };
        }
      }
    }

    // Confirm canonical active state before success
    const { data: confirmed } = await supabase
      .from("affiliates")
      .select("id, is_active, affiliate_code")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!confirmed?.is_active) {
      const admin = createAdminClient();
      const { data: adminRow } = await admin
        .from("affiliates")
        .select("id, is_active, affiliate_code")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!adminRow?.is_active) {
        return {
          success: false,
          error: "Affiliate activation did not persist. Please try again.",
        };
      }
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
        display_name:
          profile?.full_name?.trim() ||
          String(user.user_metadata?.full_name ?? "").trim() ||
          "Creator",
      });
      if (error) return { success: false, error: error.message };
    }
  }

  const provisioned = await provisionOwnNonPrivilegedRole(role);
  if (!("ok" in provisioned)) return { success: false, error: provisioned.error };

  revalidatePath("/identity/settings");
  revalidatePath("/activate/affiliate");
  revalidatePath("/activate/influencer");
  revalidatePath("/affiliates");
  revalidatePath("/affiliates/dashboard");
  revalidatePath("/affiliates/links");
  revalidatePath("/affiliates/payouts");
  revalidatePath("/affiliates/analytics");

  let affiliateCode: string | undefined;
  if (role === "affiliate") {
    const { data: row } = await supabase
      .from("affiliates")
      .select("affiliate_code")
      .eq("user_id", user.id)
      .maybeSingle();
    affiliateCode = row?.affiliate_code ?? undefined;
  }

  return { success: true, data: { affiliateCode } };
}
