import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { type NextRequest, NextResponse } from "next/server";
import {
  AFFILIATE_REF_COOKIE,
  AFFILIATE_REF_COOKIE_LEGACY,
  AFFILIATE_REF_FIRST_COOKIE,
  AFFILIATE_REF_TS_COOKIE,
  attributionCookieOptions,
  DEFAULT_ATTRIBUTION_WINDOW_DAYS,
} from "@/lib/affiliate/attribution";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createServiceRoleClient() as any;

  let destination = "/marketplace";
  let linkId: string | null = null;
  let affiliateId: string | null = null;
  let campaignId: string | null = null;
  let windowDays = DEFAULT_ATTRIBUTION_WINDOW_DAYS;
  /** Cookie must store LNK-/CMP-/affiliate_code — never a custom slug alone. */
  let cookieCode = code;

  if (code.startsWith("LNK-")) {
    const { data: link } = await supabase
      .from("affiliate_links")
      .select("id, affiliate_id, campaign_id, destination_url, is_active, expires_at, link_code")
      .eq("link_code", code)
      .maybeSingle();
    if (!link?.is_active) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    linkId = link.id;
    affiliateId = link.affiliate_id;
    campaignId = link.campaign_id;
    destination = link.destination_url || "/marketplace";
    cookieCode = link.link_code || code;
  } else if (code.startsWith("CMP-")) {
    const { data: campaign } = await supabase
      .from("affiliate_campaigns")
      .select("id, status, attribution_window_days, product_id, metadata")
      .eq("tracking_code", code)
      .maybeSingle();
    if (!campaign || campaign.status !== "active") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    campaignId = campaign.id;
    windowDays = Number(campaign.attribution_window_days) || windowDays;
    destination = `/marketplace?ref=${encodeURIComponent(code)}`;
    cookieCode = code;
  } else {
    // Prefer custom short slug on affiliate_links, then profile affiliate_code
    const { data: link } = await supabase
      .from("affiliate_links")
      .select("id, affiliate_id, campaign_id, destination_url, is_active, expires_at, link_code")
      .eq("custom_slug", code.toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (link) {
      if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      linkId = link.id;
      affiliateId = link.affiliate_id;
      campaignId = link.campaign_id;
      destination = link.destination_url || "/marketplace";
      cookieCode = link.link_code || code;
    } else {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("id, is_active")
        .eq("affiliate_code", code)
        .maybeSingle();
      if (!aff?.is_active) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      affiliateId = aff.id;
      destination = `/marketplace?ref=${encodeURIComponent(code)}`;
      cookieCode = code;
    }
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";
  const deviceType = /mobile|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop";
  const sessionKey =
    request.cookies.get("jimvio_sid")?.value ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;

  if (linkId && affiliateId) {
    await supabase.rpc("record_affiliate_click", {
      p_link_id: linkId,
      p_affiliate_id: affiliateId,
      p_campaign_id: campaignId,
      p_ip: ip,
      p_user_agent: userAgent,
      p_referrer: referer,
      p_device_type: deviceType,
      p_session_key: sessionKey,
    });
  } else if (affiliateId) {
    const { data: aff } = await supabase
      .from("affiliates")
      .select("total_clicks")
      .eq("id", affiliateId)
      .maybeSingle();
    if (aff) {
      await supabase
        .from("affiliates")
        .update({ total_clicks: Number(aff.total_clicks ?? 0) + 1 })
        .eq("id", affiliateId);
    }
  }

  const response = NextResponse.redirect(new URL(destination, request.url));
  const opts = attributionCookieOptions(windowDays * 24 * 60 * 60);
  if (!request.cookies.get(AFFILIATE_REF_FIRST_COOKIE)?.value) {
    response.cookies.set(AFFILIATE_REF_FIRST_COOKIE, cookieCode, opts);
  }
  response.cookies.set(AFFILIATE_REF_COOKIE, cookieCode, opts);
  response.cookies.set(AFFILIATE_REF_COOKIE_LEGACY, cookieCode, opts);
  response.cookies.set(AFFILIATE_REF_TS_COOKIE, String(Date.now()), opts);
  return response;
}
