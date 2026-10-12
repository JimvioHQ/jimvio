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
import {
  isLikelyAutomatedClick,
  isRepeatReferralHit,
  safeAffiliateDestination,
} from "@/lib/affiliate/tracking-guard";

/** Privacy-safe IP retention: IPv4 /24 only (inet-safe). */
function truncateIpForPrivacy(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const v = ip.trim();
  if (!v) return null;
  // Only keep valid IPv4 /24 prefixes — avoids inet cast failures on IPv6/truncated forms.
  const m = v.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const octets = m.slice(1, 5).map(Number);
  if (octets.some((n) => n > 255)) return null;
  return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
}

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
    destination = safeAffiliateDestination(link.destination_url, request.url);
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
      destination = safeAffiliateDestination(link.destination_url, request.url);
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

  // Privacy: store truncated IPv4 /24 only; skip invalid/non-IPv4 values for inet column.
  const rawIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const ip = truncateIpForPrivacy(rawIp);
  const userAgent = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";
  const deviceType = /mobile|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop";
  const sessionKey =
    request.cookies.get("jimvio_sid")?.value ||
    truncateIpForPrivacy(
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ) ||
    null;

  const repeat = isRepeatReferralHit(request.cookies.get(AFFILIATE_REF_COOKIE)?.value, cookieCode);
  const automated = isLikelyAutomatedClick(userAgent);

  try {
    if (linkId && affiliateId && !repeat && !automated) {
      const { error: clickError } = await supabase.rpc("record_affiliate_click", {
        p_link_id: linkId,
        p_affiliate_id: affiliateId,
        p_campaign_id: campaignId,
        p_ip: ip,
        p_user_agent: userAgent.slice(0, 400),
        p_referrer: referer.slice(0, 500),
        p_device_type: deviceType,
        p_session_key: sessionKey,
      });
      if (clickError) {
        console.warn("[ref] record_affiliate_click failed:", clickError.message || clickError);
      }
    }
  } catch (err) {
    // Fail-open for shoppers: attribution cookies still set below.
    console.warn("[ref] click recording failed:", err);
  }

  const response = NextResponse.redirect(new URL(safeAffiliateDestination(destination, request.url), request.url));
  const opts = attributionCookieOptions(windowDays * 24 * 60 * 60);
  if (!request.cookies.get(AFFILIATE_REF_FIRST_COOKIE)?.value) {
    response.cookies.set(AFFILIATE_REF_FIRST_COOKIE, cookieCode, opts);
  }
  response.cookies.set(AFFILIATE_REF_COOKIE, cookieCode, opts);
  response.cookies.set(AFFILIATE_REF_COOKIE_LEGACY, cookieCode, opts);
  response.cookies.set(AFFILIATE_REF_TS_COOKIE, String(Date.now()), opts);
  return response;
}
