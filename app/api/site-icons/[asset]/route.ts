import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteIconDefinition, SITE_ICON_SETTING_KEY, SITE_ICON_BUCKET } from "@/lib/site-icons/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ asset: string }> }) {
  const { asset } = await context.params;
  const definition = getSiteIconDefinition(asset);
  if (!definition) return new NextResponse("Not found", { status: 404 });

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("platform_settings").select("value, updated_at").eq("key", SITE_ICON_SETTING_KEY).maybeSingle();
    if (error) throw error;
    const value = data?.value && typeof data.value === "object" ? data.value as { assets?: Record<string, { path?: string; contentType?: string; updatedAt?: string }> } : {};
    const selected = value.assets?.[asset];
    if (!selected?.path) {
      return NextResponse.redirect(new URL(definition.defaultPath, request.url), {
        status: 307,
        headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
      });
    }
    const { data: file, error: downloadError } = await admin.storage.from(SITE_ICON_BUCKET).download(selected.path);
    if (downloadError || !file) throw downloadError ?? new Error("Icon file unavailable");
    const bytes = Buffer.from(await file.arrayBuffer());
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": selected.contentType ?? definition.contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "ETag": `"${selected.updatedAt ?? data?.updated_at ?? "default"}"`,
      },
    });
  } catch (error) {
    console.error("[site-icons] serve failed", error);
    return NextResponse.redirect(new URL(definition.defaultPath, request.url), {
      status: 307,
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    });
  }
}
