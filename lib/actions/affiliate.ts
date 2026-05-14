"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Captures a referral visit, sets the cookie, and increments click count.
 * Handles both affiliate_code (AFF-) and link_code (LNK-).
 */
export async function recordReferralVisit(code: string, pathname?: string) {
  if (!code) return { success: false };

  console.log(`[recordReferralVisit] Processing code: ${code}, pathname: ${pathname}`);

  const supabase = await createClient();
  const cookieStore = await cookies();

  let affiliateId: string | null = null;
  let linkId: string | null = null;

  if (code.startsWith("LNK-")) {
    const { data: link, error: linkErr } = await supabase
      .from("affiliate_links")
      .select("id, affiliate_id")
      .eq("link_code", code)
      .maybeSingle();

    if (linkErr) console.error("[recordReferralVisit] Link error:", linkErr);

    if (link) {
      affiliateId = link.affiliate_id;
      linkId = link.id;
      console.log(`[recordReferralVisit] Resolved as LNK, linkId: ${linkId}`);
    }
  } else {
    const { data: aff, error: affErr } = await supabase
      .from("affiliates")
      .select("id")
      .eq("affiliate_code", code)
      .maybeSingle();

    if (affErr) console.error("[recordReferralVisit] Affiliate error:", affErr);

    if (aff) {
      affiliateId = aff.id;
      console.log(`[recordReferralVisit] Resolved as AFF, affiliateId: ${affiliateId}`);

      if (pathname?.startsWith("/marketplace/")) {
        const slug = pathname.split("/").filter(Boolean).pop();
        if (slug && slug !== "marketplace") {
          console.log(`[recordReferralVisit] Searching for product link, slug: ${slug}`);

          const { data: product } = await supabase
            .from("products")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

          if (product) {
            const { data: productLink, error: plErr } = await supabase
              .from("affiliate_links")
              .select("id")
              .eq("affiliate_id", aff.id)
              .eq("product_id", product.id) // FIX: filter by product_id directly — correct FK column
              .eq("is_active", true)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (plErr) console.error("[recordReferralVisit] ProductLink error:", plErr);
            if (productLink) {
              linkId = productLink.id;
              console.log(`[recordReferralVisit] Found product linkId: ${linkId}`);
            }
          }
        }
      }
    }
  }

  if (!affiliateId) {
    console.log("[recordReferralVisit] Could not resolve affiliateId");
    return { success: false };
  }

  if (linkId) {
    const { error: clickErr } = await supabase
      .from("affiliate_links")
      .update({
        total_clicks: supabase.rpc("increment_affiliate_click" as any, {
          link_id: linkId,
        }) as any,
      })
      .eq("id", linkId);

    if (clickErr) {
      console.error("[recordReferralVisit] RPC error, falling back to manual increment:", clickErr);

      // Increment on the link
      const { data: currentLink } = await supabase
        .from("affiliate_links")
        .select("total_clicks, unique_clicks, affiliate_id")
        .eq("id", linkId)
        .single();

      if (currentLink) {
        await supabase
          .from("affiliate_links")
          .update({
            total_clicks: (currentLink.total_clicks ?? 0) + 1,
            unique_clicks: (currentLink.unique_clicks ?? 0) + 1,
          })
          .eq("id", linkId);

        // Also increment on the parent affiliate row
        const { data: currentAff } = await supabase
          .from("affiliates")
          .select("total_clicks")
          .eq("id", currentLink.affiliate_id)
          .single();

        if (currentAff) {
          await supabase
            .from("affiliates")
            .update({ total_clicks: (currentAff.total_clicks ?? 0) + 1 })
            .eq("id", currentLink.affiliate_id);
        }
      }
    } else {
      console.log("[recordReferralVisit] Click incremented");
    }
  }

  // Set cookie (expires in 30 days)
  cookieStore.set("jimvio_ref", code, {
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return { success: true };
}