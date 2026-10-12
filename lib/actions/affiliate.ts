"use server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { cookies } from "next/headers";
import {
  AFFILIATE_REF_COOKIE,
  setReferralCookies,
  resolveReferralCode,
} from "@/lib/affiliate/attribution";
import { isRepeatReferralHit } from "@/lib/affiliate/tracking-guard";

/**
 * Captures a referral visit, sets first/last-touch cookies, and records a click when possible.
 */
export async function recordReferralVisit(code: string, pathname?: string) {
  if (!code) return { success: false };

  const resolved = await resolveReferralCode(code);
  if (!resolved) return { success: false };

  const supabase = createServiceRoleClient() as any;
  let linkId = resolved.linkId;

  // Prefer product-specific link when visiting a PDP with an AFF- code
  if (!linkId && pathname?.startsWith("/marketplace/") && !code.startsWith("LNK-")) {
    const slug = pathname.split("/").filter(Boolean).pop();
    if (slug && slug !== "marketplace") {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (product) {
        const { data: productLink } = await supabase
          .from("affiliate_links")
          .select("id")
          .eq("affiliate_id", resolved.affiliateId)
          .eq("product_id", product.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (productLink) linkId = productLink.id;
      }
    }
  }

  const jar = await cookies();
  const repeat = isRepeatReferralHit(jar.get(AFFILIATE_REF_COOKIE)?.value, resolved.referralCode);
  if (linkId && !repeat) {
    const { error: clickError } = await supabase.rpc("record_affiliate_click", {
      p_link_id: linkId,
      p_affiliate_id: resolved.affiliateId,
      p_campaign_id: resolved.campaignId,
      p_ip: null,
      p_user_agent: null,
      p_referrer: pathname?.slice(0, 500) ?? null,
      p_device_type: null,
      p_session_key: jar.get("jimvio_sid")?.value ?? null,
    });
    if (clickError) {
      console.warn("[recordReferralVisit] click RPC failed:", clickError.message);
    }
  }

  await setReferralCookies(resolved.referralCode, resolved.attributionWindowDays);
  return { success: true };
}
