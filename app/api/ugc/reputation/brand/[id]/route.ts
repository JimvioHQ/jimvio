import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { recomputeBrandReputation } from "@/lib/ugc/platform/reputation";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params;
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const force = req.nextUrl.searchParams.get("recompute") === "true";

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
      if (!stale) return NextResponse.json({ reputation: existing });
    }
  }

  const { data: vendor } = await db
    .from("vendors")
    .select("id, business_name, business_logo, business_slug")
    .eq("id", brandId)
    .maybeSingle();
  if (!vendor) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const reputation = await recomputeBrandReputation(db, brandId);
  return NextResponse.json({ reputation, brand: vendor });
}
