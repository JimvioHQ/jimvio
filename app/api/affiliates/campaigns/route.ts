import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAffiliateCampaign,
  listCampaignsForUser,
} from "@/lib/affiliate/campaigns";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await listCampaignsForUser(user.id);
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  try {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const campaign = await createAffiliateCampaign({
      createdBy: user.id,
      vendorId: vendor?.id ?? null,
      name,
      description: body?.description ?? null,
      commissionRate: body?.commissionRate != null ? Number(body.commissionRate) : 10,
      budgetAmount: body?.budgetAmount != null ? Number(body.budgetAmount) : null,
      currency: body?.currency ?? "USD",
      productId: body?.productId ?? null,
      communityId: body?.communityId ?? null,
      attributionModel: body?.attributionModel === "first_touch" ? "first_touch" : "last_touch",
      attributionWindowDays:
        body?.attributionWindowDays != null
          ? Number(body.attributionWindowDays)
          : undefined,
    });
    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create campaign" },
      { status: 400 }
    );
  }
}
