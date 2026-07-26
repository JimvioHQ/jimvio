"use server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { setReferralCookies, resolveReferralCode } from "@/lib/affiliate/attribution";

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

  if (linkId) {
    await supabase.rpc("record_affiliate_click", {
      p_link_id: linkId,
      p_affiliate_id: resolved.affiliateId,
      p_campaign_id: resolved.campaignId,
      p_ip: null,
      p_user_agent: null,
      p_referrer: pathname ?? null,
      p_device_type: null,
      p_session_key: null,
    });
  } else {
    const { data: aff } = await supabase
      .from("affiliates")
      .select("total_clicks")
      .eq("id", resolved.affiliateId)
      .maybeSingle();
    if (aff) {
      await supabase
        .from("affiliates")
        .update({ total_clicks: Number(aff.total_clicks ?? 0) + 1 })
        .eq("id", resolved.affiliateId);
    }
  }

  await setReferralCookies(code, resolved.attributionWindowDays);
  return { success: true };
}
