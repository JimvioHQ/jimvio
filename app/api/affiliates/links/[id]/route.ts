import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function requireOwnedLink(linkId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!affiliate?.is_active) {
    return { error: NextResponse.json({ error: "Affiliate profile required" }, { status: 403 }) };
  }

  const client = createServiceRoleClient() as any;
  const { data: link } = await client
    .from("affiliate_links")
    .select("id, affiliate_id")
    .eq("id", linkId)
    .maybeSingle();

  if (!link || link.affiliate_id !== affiliate.id) {
    return { error: NextResponse.json({ error: "Link not found" }, { status: 404 }) };
  }

  return { affiliate, client, linkId };
}

/** PATCH — rename (custom_slug), expire, activate/deactivate a link. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const auth = await requireOwnedLink(id);
  if ("error" in auth && auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.customSlug === "string") {
    const slug = body.customSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 48);
    patch.custom_slug = slug || null;
  }

  if (typeof body.isActive === "boolean") {
    patch.is_active = body.isActive;
  }

  if (body.expire === true) {
    patch.expires_at = new Date().toISOString();
    patch.is_active = false;
  } else if (typeof body.expiresAt === "string" || body.expiresAt === null) {
    patch.expires_at = body.expiresAt;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await auth.client!
    .from("affiliate_links")
    .update(patch)
    .eq("id", id)
    .eq("affiliate_id", auth.affiliate!.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, link: data });
}
