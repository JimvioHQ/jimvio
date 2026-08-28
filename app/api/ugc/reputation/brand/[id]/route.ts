import { NextRequest, NextResponse } from "next/server";
import { isAdmin, requireUser } from "@/lib/ugc/platform/auth";
import { resolveBrandRole } from "@/lib/ugc/enterprise/permissions";
import { recomputeBrandReputation } from "@/lib/ugc/platform/reputation";

export const dynamic = "force-dynamic";

function redactReputation(reputation: Record<string, unknown> | null, showMoney: boolean) {
  if (!reputation) return reputation;
  if (showMoney) return reputation;
  return { ...reputation, total_paid: null };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params;
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const force = req.nextUrl.searchParams.get("recompute") === "true";
  const admin = await isAdmin(user.id);
  const role = await resolveBrandRole(db, brandId, user.id);
  const canSeeMoney = admin || role != null;
  const canRecompute = admin || role != null;

  if (force && !canRecompute) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!force) {
    const { data: existing } = await db
      .from("ugc_brand_reputation")
      .select("*")
      .eq("brand_id", brandId)
      .maybeSingle();

    if (existing) {
      const stale =
        !existing.updated_at ||
        Date.now() - new Date(existing.updated_at).getTime() > 24 * 3600 * 1000;
      if (!stale || !canRecompute) {
        return NextResponse.json({
          reputation: redactReputation(existing as Record<string, unknown>, canSeeMoney),
        });
      }
    }
  }

  if (!canRecompute) {
    return NextResponse.json({ reputation: null });
  }

  const { data: vendor } = await db
    .from("vendors")
    .select("id, business_name, business_logo, business_slug")
    .eq("id", brandId)
    .maybeSingle();
  if (!vendor) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const reputation = await recomputeBrandReputation(db, brandId);
  return NextResponse.json({
    reputation: redactReputation(reputation as Record<string, unknown>, canSeeMoney),
    brand: vendor,
  });
}
