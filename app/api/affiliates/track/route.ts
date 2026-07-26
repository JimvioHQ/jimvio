import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  AFFILIATE_REF_COOKIE,
  AFFILIATE_REF_COOKIE_LEGACY,
} from "@/lib/commerce/affiliate-hooks";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const linkCode = searchParams.get("ref");

    if (!linkCode) {
      return NextResponse.redirect(new URL("/marketplace", req.url));
    }

    // Service role: affiliate_clicks insert is locked down from anon/authenticated.
    const supabase = createServiceRoleClient();

    const { data: link } = await supabase
      .from("affiliate_links")
      .select("id, affiliate_id, destination_url, product_id, is_active")
      .eq("link_code", linkCode)
      .single();

    if (!link || !link.is_active) {
      return NextResponse.redirect(new URL("/marketplace", req.url));
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip");
    const userAgent = req.headers.get("user-agent") || "";
    const referer = req.headers.get("referer") || "";

    const deviceType = /mobile|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop";

    await supabase.from("affiliate_clicks").insert({
      link_id: link.id,
      affiliate_id: link.affiliate_id,
      ip_address: ip,
      user_agent: userAgent,
      referrer: referer,
      device_type: deviceType,
    });

    await supabase.rpc("increment_link_clicks", { p_link_id: link.id });
    await supabase.rpc("increment_affiliate_clicks", { p_affiliate_id: link.affiliate_id });

    const redirectUrl = new URL(link.destination_url, req.url);
    redirectUrl.searchParams.set("_aff", linkCode);

    const response = NextResponse.redirect(redirectUrl);
    const cookieOpts = {
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    };
    // Canonical cookie used by checkout + cart attribution
    response.cookies.set(AFFILIATE_REF_COOKIE, linkCode, cookieOpts);
    // Keep legacy name briefly for any older readers
    response.cookies.set(AFFILIATE_REF_COOKIE_LEGACY, linkCode, cookieOpts);

    return response;
  } catch (error) {
    console.error("Affiliate tracking error:", error);
    return NextResponse.redirect(new URL("/marketplace", req.url));
  }
}
