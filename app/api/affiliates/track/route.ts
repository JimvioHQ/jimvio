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
import {
  isLikelyAutomatedClick,
  isRepeatReferralHit,
  safeAffiliateDestination,
} from "@/lib/affiliate/tracking-guard";

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
      .select("id, affiliate_id, campaign_id, destination_url, product_id, is_active, expires_at")
      .eq("link_code", linkCode)
      .single();

    if (!link || !link.is_active) {
      return NextResponse.redirect(new URL("/marketplace", req.url));
    }
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.redirect(new URL("/marketplace", req.url));
    }

    const rawIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    const ipv4 = rawIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    const ip = ipv4 ? `${ipv4[1]}.${ipv4[2]}.${ipv4[3]}.0` : null;
    const userAgent = req.headers.get("user-agent") || "";
    const referer = req.headers.get("referer") || "";
    const deviceType = /mobile|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop";
    const sessionKey = req.cookies.get("jimvio_sid")?.value || ip;
    const repeat = isRepeatReferralHit(req.cookies.get(AFFILIATE_REF_COOKIE)?.value, linkCode);

    if (!repeat && !isLikelyAutomatedClick(userAgent)) {
      const { error: clickError } = await supabase.rpc("record_affiliate_click", {
        p_link_id: link.id,
        p_affiliate_id: link.affiliate_id,
        p_campaign_id: link.campaign_id,
        p_ip: ip,
        p_user_agent: userAgent.slice(0, 400),
        p_referrer: referer.slice(0, 500),
        p_device_type: deviceType,
        p_session_key: sessionKey,
      });
      if (clickError) {
        console.warn("[affiliate-track] click recording failed:", clickError.message || clickError);
      }
    }

    const redirectUrl = new URL(safeAffiliateDestination(link.destination_url, req.url), req.url);
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
