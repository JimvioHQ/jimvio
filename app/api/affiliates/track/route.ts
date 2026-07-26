import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  AFFILIATE_REF_COOKIE,
  AFFILIATE_REF_COOKIE_LEGACY,
  AFFILIATE_REF_FIRST_COOKIE,
  AFFILIATE_REF_TS_COOKIE,
  attributionCookieOptions,
  DEFAULT_ATTRIBUTION_WINDOW_DAYS,
} from "@/lib/affiliate/attribution";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const linkCode = searchParams.get("ref");

    if (!linkCode) {
      return NextResponse.redirect(new URL("/marketplace", req.url));
    }

    const supabase = createServiceRoleClient() as any;

    const { data: link } = await supabase
      .from("affiliate_links")
      .select("id, affiliate_id, campaign_id, destination_url, product_id, is_active")
      .eq("link_code", linkCode)
      .single();

    if (!link || !link.is_active) {
      return NextResponse.redirect(new URL("/marketplace", req.url));
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip");
    const userAgent = req.headers.get("user-agent") || "";
    const referer = req.headers.get("referer") || "";
    const deviceType = /mobile|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop";
    const sessionKey =
      req.cookies.get("jimvio_sid")?.value ||
      ip ||
      null;

    await supabase.rpc("record_affiliate_click", {
      p_link_id: link.id,
      p_affiliate_id: link.affiliate_id,
      p_campaign_id: link.campaign_id,
      p_ip: ip,
      p_user_agent: userAgent,
      p_referrer: referer,
      p_device_type: deviceType,
      p_session_key: sessionKey,
    });

    const redirectUrl = new URL(link.destination_url, req.url);
    redirectUrl.searchParams.set("_aff", linkCode);

    const response = NextResponse.redirect(redirectUrl);
    const opts = attributionCookieOptions(DEFAULT_ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60);
    if (!req.cookies.get(AFFILIATE_REF_FIRST_COOKIE)?.value) {
      response.cookies.set(AFFILIATE_REF_FIRST_COOKIE, linkCode, opts);
    }
    response.cookies.set(AFFILIATE_REF_COOKIE, linkCode, opts);
    response.cookies.set(AFFILIATE_REF_COOKIE_LEGACY, linkCode, opts);
    response.cookies.set(AFFILIATE_REF_TS_COOKIE, String(Date.now()), opts);

    return response;
  } catch (error) {
    console.error("Affiliate tracking error:", error);
    return NextResponse.redirect(new URL("/marketplace", req.url));
  }
}
