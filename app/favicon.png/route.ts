import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_ICON_BUCKET, SITE_ICON_SETTING_KEY } from "@/lib/site-icons/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stable root-level favicon URL linked from every page for Google Search. */
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", SITE_ICON_SETTING_KEY)
      .maybeSingle();
    if (error) throw error;
    const value = data?.value && typeof data.value === "object"
      ? data.value as { assets?: Record<string, { path?: string; updatedAt?: string }> }
      : {};
    const asset = value.assets?.["favicon-96"];
    if (!asset?.path) {
      return NextResponse.redirect(new URL("/icons/icon-96.png", request.url), {
        status: 307,
        headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
      });
    }
    const { data: file, error: downloadError } = await admin.storage.from(SITE_ICON_BUCKET).download(asset.path);
    if (downloadError || !file) throw downloadError ?? new Error("Favicon asset unavailable");
    const bytes = Buffer.from(await file.arrayBuffer());
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
        "ETag": '"' + (asset.updatedAt ?? "default") + '"',
      },
    });
  } catch (error) {
    console.error("[favicon.png] dynamic icon lookup failed", error);
    return NextResponse.redirect(new URL("/icons/icon-96.png", request.url), {
      status: 307,
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  }
}
