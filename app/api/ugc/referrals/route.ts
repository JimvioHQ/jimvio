import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

function generateCode() {
  return `JV${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, influencer } = await requireInfluencer(user.id);

  const { data: code } = await db
    .from("ugc_referral_codes")
    .select("*")
    .eq("owner_user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let attributions: unknown[] = [];
  if (code) {
    const { data } = await db
      .from("ugc_referral_attributions")
      .select("*")
      .eq("code_id", code.id)
      .order("created_at", { ascending: false });
    attributions = data ?? [];
  }

  const { data: leaderboardRaw } = await db
    .from("ugc_referral_codes")
    .select("id, code, owner_user_id, uses, reward_amount, influencer_id")
    .eq("is_active", true)
    .order("uses", { ascending: false })
    .limit(20);

  const ownerIds = Array.from(
    new Set((leaderboardRaw ?? []).map((r) => r.owner_user_id).filter(Boolean))
  );
  let profilesById = new Map<string, { id: string; username: string | null; full_name: string | null }>();
  if (ownerIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, username, full_name")
      .in("id", ownerIds);
    profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
  }

  const leaderboard = (leaderboardRaw ?? []).map((row) => ({
    ...row,
    owner: profilesById.get(row.owner_user_id) ?? null,
  }));

  return NextResponse.json({
    code: code ?? null,
    attributions,
    leaderboard,
    influencerId: influencer?.id ?? null,
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, influencer } = await requireInfluencer(user.id);
  const body = await req.json().catch(() => ({}));

  const { data: existing } = await db
    .from("ugc_referral_codes")
    .select("*")
    .eq("owner_user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ code: existing, created: false });
  }

  let codeValue =
    typeof body.code === "string" && body.code.trim()
      ? body.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "")
      : generateCode();

  if (codeValue.length < 4) codeValue = generateCode();

  const { data: created, error: iErr } = await db
    .from("ugc_referral_codes")
    .insert({
      owner_user_id: user.id,
      influencer_id: influencer?.id ?? null,
      code: codeValue,
      reward_amount: body.reward_amount != null ? Number(body.reward_amount) : 5,
      reward_currency: typeof body.reward_currency === "string" ? body.reward_currency : "USD",
      is_active: true,
    })
    .select()
    .single();

  if (iErr) {
    // Race: another request created a code
    if (iErr.code === "23505") {
      const { data: again } = await db
        .from("ugc_referral_codes")
        .select("*")
        .eq("owner_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (again) return NextResponse.json({ code: again, created: false });
    }
    return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  return NextResponse.json({ code: created, created: true }, { status: 201 });
}
