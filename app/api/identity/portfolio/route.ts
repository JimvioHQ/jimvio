import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { toPortfolioItem } from "@/lib/identity/resolve";
import { onPortfolioPublished } from "@/lib/identity/xp";
import type { PortfolioItem } from "@/lib/identity/types";

export const dynamic = "force-dynamic";

const KINDS = new Set(["video", "image", "campaign", "brand", "testimonial", "other"]);

/**
 * GET /api/identity/portfolio?userId=...
 * Public items only, unless the viewer owns the portfolio.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const { user: viewer } = await requireUser();
  let targetId = userId;
  if (!targetId) {
    if (!viewer) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    targetId = viewer.id;
  }

  const db = createServiceRoleClient();
  let query = db
    .from("jip_portfolio_items")
    .select("*")
    .eq("user_id", targetId)
    .order("sort_order", { ascending: true });

  if (!viewer || viewer.id !== targetId) {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: ((data ?? []) as PortfolioItem[]).map(toPortfolioItem) });
}

/**
 * POST /api/identity/portfolio
 * Body: { kind, title, description?, mediaUrl?, thumbnailUrl?, externalUrl?,
 *         brandName?, campaignId?, sortOrder?, isFeatured?, isPublic? }
 */
export async function POST(req: NextRequest) {
  const { user, db: rawDb, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const db = rawDb as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind ?? "").toLowerCase();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const payload = {
    user_id: user.id,
    kind,
    title,
    description: typeof body.description === "string" ? body.description : null,
    media_url: typeof body.mediaUrl === "string" ? body.mediaUrl : null,
    thumbnail_url: typeof body.thumbnailUrl === "string" ? body.thumbnailUrl : null,
    external_url: typeof body.externalUrl === "string" ? body.externalUrl : null,
    brand_name: typeof body.brandName === "string" ? body.brandName : null,
    campaign_id: typeof body.campaignId === "string" ? body.campaignId : null,
    sort_order: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    is_featured: Boolean(body.isFeatured),
    is_public: body.isPublic === undefined ? true : Boolean(body.isPublic),
  };

  const { data, error: insertErr } = await db
    .from("jip_portfolio_items")
    .insert(payload)
    .select("*")
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });

  // Best-effort achievements — never fails the request.
  onPortfolioPublished(user.id, data.id).catch((err) => {
    console.error("POST /api/identity/portfolio: onPortfolioPublished failed", err);
  });

  return NextResponse.json({ item: toPortfolioItem(data as PortfolioItem) }, { status: 201 });
}

/**
 * PATCH /api/identity/portfolio
 * Body: { id, ...any updatable fields (camelCase) }
 */
export async function PATCH(req: NextRequest) {
  const { user, db: rawDb, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const db = rawDb as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.description === "string") updates.description = body.description;
  if (typeof body.mediaUrl === "string") updates.media_url = body.mediaUrl;
  if (typeof body.thumbnailUrl === "string") updates.thumbnail_url = body.thumbnailUrl;
  if (typeof body.externalUrl === "string") updates.external_url = body.externalUrl;
  if (typeof body.brandName === "string") updates.brand_name = body.brandName;
  if (typeof body.campaignId === "string") updates.campaign_id = body.campaignId;
  if (body.kind !== undefined) {
    if (!KINDS.has(String(body.kind))) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    updates.kind = body.kind;
  }
  if (body.sortOrder !== undefined) updates.sort_order = Number(body.sortOrder) || 0;
  if (body.isFeatured !== undefined) updates.is_featured = Boolean(body.isFeatured);
  if (body.isPublic !== undefined) updates.is_public = Boolean(body.isPublic);

  const { data, error: updateErr } = await db
    .from("jip_portfolio_items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: toPortfolioItem(data as PortfolioItem) });
}

/**
 * DELETE /api/identity/portfolio?id=...
 */
export async function DELETE(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error: deleteErr } = await db
    .from("jip_portfolio_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
