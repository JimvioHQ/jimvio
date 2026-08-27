import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(req: NextRequest) {
  const { user, error: authError } = await requireUser();
  if (!user) return NextResponse.json({ error: authError }, { status: 401, ...noStore });

  const { db, influencer, mirror, completion, ready } = await requireInfluencer(user.id);
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const offset = (page - 1) * limit;
  const status = searchParams.get("status") ?? undefined;

  const [{ data: profile }, { data: jip }] = await Promise.all([
    db.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    db.from("jip_identity").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const needsProfile = !ready;
  console.info("[ugc-participants]", {
    userId: user.id,
    profile: Boolean(profile?.id),
    jip: Boolean(jip?.user_id),
    influencer: Boolean(influencer?.id),
    completionComplete: completion.complete,
    missing: completion.missing.map((m) => m.id),
    mirrorCreated: mirror.created,
    mirrorReason: mirror.reason,
    needsProfile,
  });

  if (!ready || !influencer) {
    return NextResponse.json(
      {
        data: [],
        total: 0,
        page,
        limit,
        needsProfile: true,
        complete: false,
        missing: completion.missing,
      },
      noStore,
    );
  }

  let query = db
    .from("ugc_campaign_participants")
    .select(
      `
      *,
      campaign:ugc_campaigns!campaign_id (
        id,
        title,
        status,
        campaign_type,
        ends_at,
        payment_model,
        fixed_rate,
        rate_per_1k_views,
        media:ugc_campaign_media(*),
        vendor:vendors!brand_id (
          business_name,
          business_logo,
          business_slug
        )
      )
    `,
      { count: "exact" },
    )
    .eq("influencer_id", influencer.id)
    .order("joined_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, ...noStore });

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit }, noStore);
}
