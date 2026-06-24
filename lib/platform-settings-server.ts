import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  PLATFORM_SETTINGS_DEFAULTS,
  resolvePlatformSettingsFromRows,
  type ResolvedPlatformSettings,
} from "@/lib/platform-settings-shared";

export const getResolvedPlatformSettings = cache(async (): Promise<ResolvedPlatformSettings> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["fees", "social_proof", "marketing", "contact"]);
    return resolvePlatformSettingsFromRows(data ?? []);
  } catch {
    return PLATFORM_SETTINGS_DEFAULTS;
  }
});

export async function getDefaultAffiliateCommissionPercent(): Promise<number> {
  const s = await getResolvedPlatformSettings();
  const n = Number(s.fees.default_affiliate_commission_percent);
  return Number.isFinite(n) && n >= 0 && n <= 100
    ? n
    : PLATFORM_SETTINGS_DEFAULTS.fees.default_affiliate_commission_percent;
}

export const getPaymentProvidersSettings = cache(async () => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "payment_providers")
      .maybeSingle();
    const { mergePaymentProviders } = await import("@/lib/platform-settings-shared");
    return mergePaymentProviders(
      typeof data?.value === "object" && data.value ? (data.value as object) : {}
    );
  } catch {
    const { DEFAULT_PAYMENT_PROVIDERS } = await import("@/lib/platform-settings-shared");
    return DEFAULT_PAYMENT_PROVIDERS;
  }
});

export async function getShopifyPlatformCommissionFallback(db: SupabaseClient): Promise<number> {
  const { data } = await db.from("platform_settings").select("value").eq("key", "fees").maybeSingle();
  const raw = data?.value as Record<string, unknown> | null;
  const fromDb =
    raw && raw.shopify_default_platform_commission_percent != null
      ? Number(raw.shopify_default_platform_commission_percent)
      : NaN;
  if (Number.isFinite(fromDb) && fromDb >= 0 && fromDb <= 100) return fromDb;
  return Number(process.env.SHOPIFY_DEFAULT_PLATFORM_COMMISSION_RATE || 8);
}
