import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import {
  brandIdFromRequest,
  requireBrandWorkspacePermission,
} from "@/lib/ugc/enterprise/brand-access";
import { recordUgcActivity } from "@/lib/ugc/platform/activity";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const ws = await requireBrandWorkspacePermission(
    user.id,
    "campaigns.manage",
    brandIdFromRequest(req),
  );
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;

  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.is_favorite === "boolean") patch.is_favorite = body.is_favorite;
  if (body.payload && typeof body.payload === "object") patch.payload = body.payload;

  const { data, error: uErr } = await db
    .from("ugc_campaign_templates")
    .update(patch)
    .eq("id", id)
    .eq("brand_id", vendor.id)
    .select("*")
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const ws = await requireBrandWorkspacePermission(
    user.id,
    "campaigns.manage",
    brandIdFromRequest(req),
  );
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;

  const { error: dErr } = await db
    .from("ugc_campaign_templates")
    .delete()
    .eq("id", id)
    .eq("brand_id", vendor.id);

  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Create a draft campaign from a template and return create-wizard redirect. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const ws = await requireBrandWorkspacePermission(
    user.id,
    "campaigns.manage",
    brandIdFromRequest(req),
  );
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;

  const { data: template } = await db
    .from("ugc_campaign_templates")
    .select("*")
    .eq("id", id)
    .eq("brand_id", vendor.id)
    .single();

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const p = template.payload as Record<string, unknown>;
  const media = Array.isArray(p.media) ? p.media : [];

  const { data: created, error: cErr } = await db
    .from("ugc_campaigns")
    .insert({
      brand_id: vendor.id,
      title: String(p.title ?? template.name),
      description: (p.description as string) ?? template.description,
      campaign_type: p.campaign_type ?? "ugc",
      payment_model: p.payment_model ?? "per_views",
      status: "draft",
      rate_per_1k_views: Number(p.rate_per_1k_views) || 1,
      fixed_rate: Number(p.fixed_rate) || 0,
      total_budget: Number(p.total_budget) || 100,
      max_payout_per_sub: p.max_payout_per_sub ?? null,
      allowed_platforms: p.allowed_platforms ?? ["tiktok", "instagram"],
      min_duration: p.min_duration ?? null,
      max_duration: p.max_duration ?? null,
      required_hashtags: p.required_hashtags ?? [],
      required_mentions: p.required_mentions ?? [],
      required_keywords: p.required_keywords ?? [],
      requires_face: Boolean(p.requires_face),
      music_track_url: p.music_track_url ?? null,
      music_artist_name: p.music_artist_name ?? null,
      promotion_target: p.promotion_target ?? null,
      promotion_target_url: p.promotion_target_url ?? null,
      join_mode: p.join_mode ?? "instant",
      join_config: p.join_config ?? {},
      max_participants: p.max_participants ?? null,
    })
    .select("*")
    .single();

  if (cErr || !created) {
    return NextResponse.json({ error: cErr?.message ?? "Failed" }, { status: 500 });
  }

  if (media.length) {
    await db.from("ugc_campaign_media").insert(
      media.map((m: { type?: string; url: string; usage?: string }, i: number) => ({
        campaign_id: created.id,
        type: m.type || "image",
        url: m.url,
        usage: m.usage || "example",
        order_index: i,
      }))
    );
  }

  await db
    .from("ugc_campaign_templates")
    .update({ use_count: (template.use_count ?? 0) + 1, updated_at: new Date().toISOString() })
    .eq("id", id);

  await recordUgcActivity(db, {
    campaignId: created.id,
    eventType: "campaign_created",
    title: "Campaign created from template",
    description: template.name,
    actorUserId: user.id,
    metadata: { template_id: template.id },
  });

  return NextResponse.json({
    campaign: created,
    draftForm: {
      ...p,
      title: created.title,
      media,
    },
    redirectTo: `/ugc/campaign-center/create?duplicate=${created.id}`,
  });
}
