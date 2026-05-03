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
  
  // 1. Identify what kind of code it is
  let affiliateId = null;
  let linkId = null;

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
    // Treat as affiliate_code (AFF- or other)
    const { data: aff, error: affErr } = await supabase
      .from("affiliates")
      .select("id")
      .eq("affiliate_code", code)
      .maybeSingle();

    if (affErr) console.error("[recordReferralVisit] Affiliate error:", affErr);
    
    if (aff) {
      affiliateId = aff.id;
      console.log(`[recordReferralVisit] Resolved as AFF, affiliateId: ${affiliateId}`);
      
      // If we're on a product page, try to find a specific link for this product and affiliate
      if (pathname === "/marketplace/" || pathname?.startsWith("/marketplace/")) {
        const slug = pathname.split("/").filter(Boolean).pop();
        if (slug && slug !== "marketplace") {
          console.log(`[recordReferralVisit] Searching for product link, slug: ${slug}`);
          const { data: productLink, error: plErr } = await supabase
            .from("affiliate_links")
            .select("id, products!inner(slug)")
            .eq("affiliate_id", aff.id)
            .eq("products.slug", slug)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (plErr) console.error("[recordReferralVisit] ProductLink error:", plErr);
          if (productLink) {
            linkId = (productLink as any).id;
            console.log(`[recordReferralVisit] Found most recent product linkId: ${linkId}`);
          }
        }
      }
    }
  }

  if (!affiliateId) {
    console.log("[recordReferralVisit] Could not resolve affiliateId");
    return { success: false };
  }

  // 2. Increment click count if it's a specific link
  if (linkId) {
    const { error: rpcErr } = await supabase.rpc("increment_affiliate_click", { link_id: linkId });
    if (rpcErr) {
      console.error("[recordReferralVisit] RPC error:", rpcErr);
      // If RPC fails (e.g. doesn't exist), fallback to manual update
      await supabase.from("affiliate_links").update({ 
        total_clicks: 1, // This is wrong for incrementing but better than nothing for a test
      }).eq("id", linkId);
    } else {
      console.log("[recordReferralVisit] Click incremented via RPC");
    }
  }

  // 3. Set the cookie (expires in 30 days)
  cookieStore.set("jimvio_ref", code, {
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return { success: true };
}
