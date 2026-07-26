import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAffiliateLink } from "@/lib/affiliate/campaigns";

export const dynamic = "force-dynamic";

/** POST — create an affiliate short link (LNK-). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!affiliate?.is_active) {
    return NextResponse.json({ error: "Affiliate profile required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const destinationUrl =
    typeof body?.destinationUrl === "string" ? body.destinationUrl.trim() : "";
  if (!destinationUrl) {
    return NextResponse.json({ error: "destinationUrl is required" }, { status: 400 });
  }

  try {
    const link = await createAffiliateLink({
      affiliateId: affiliate.id,
      destinationUrl,
      productId: body?.productId ?? null,
      vendorId: body?.vendorId ?? null,
      campaignId: body?.campaignId ?? null,
      commissionRate:
        body?.commissionRate != null ? Number(body.commissionRate) : null,
    });
    return NextResponse.json({ ok: true, link });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create link" },
      { status: 400 }
    );
  }
}
