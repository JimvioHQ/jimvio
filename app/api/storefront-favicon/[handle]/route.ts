import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { resolveStorefrontIcons } from "@/lib/commerce-os/storefront-metadata";
import { STOREFRONT_NEUTRAL_FAVICON_PATH } from "@/lib/commerce-os/storefront-icons";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ handle: string }> };

/** Browser tab icon for a merchant host. Explicit favicon, then logo, then neutral. */
export async function GET(request: Request, ctx: Ctx) {
  const { handle } = await ctx.params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  const icons = resolveStorefrontIcons({
    favicon_url: store?.favicon_url,
    logo_url:
      store?.logo_url ||
      (typeof store?.theme_settings?.logoUrl === "string"
        ? store.theme_settings.logoUrl
        : null),
  });
  const shortcut = (icons as { shortcut?: string }).shortcut || STOREFRONT_NEUTRAL_FAVICON_PATH;
  const target = shortcut.startsWith("http")
    ? shortcut
    : new URL(shortcut, request.url).toString();

  return NextResponse.redirect(target, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
