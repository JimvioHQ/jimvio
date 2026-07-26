import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  approveCommission,
  cancelCommission,
  rejectCommission,
  refundCommission,
} from "@/lib/affiliate/commissions";

export const dynamic = "force-dynamic";

async function assertStaffOrOwner(userId: string, commissionId: string) {
  const admin = createServiceRoleClient() as any;
  const { data: commission } = await admin
    .from("affiliate_commissions")
    .select("id, affiliate_id, vendor_id, affiliates(user_id)")
    .eq("id", commissionId)
    .maybeSingle();
  if (!commission) return { ok: false as const, status: 404, error: "Not found" };

  const affiliateUserId = Array.isArray(commission.affiliates)
    ? commission.affiliates[0]?.user_id
    : commission.affiliates?.user_id;

  // Owner of the affiliate account may not approve their own commissions —
  // vendors/admins only. Affiliates can view via other routes.
  if (commission.vendor_id) {
    const { data: vendor } = await admin
      .from("vendors")
      .select("user_id")
      .eq("id", commission.vendor_id)
      .maybeSingle();
    if (vendor?.user_id === userId) return { ok: true as const, commission };
  }

  // Platform staff via profiles.role if present
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role === "admin" || profile?.role === "owner") {
    return { ok: true as const, commission };
  }

  void affiliateUserId;
  return { ok: false as const, status: 403, error: "Forbidden" };
}

/** PATCH — approve | reject | refund | cancel commission */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = await assertStaffOrOwner(user.id, id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";
  const note = typeof body?.note === "string" ? body.note : undefined;
  const amount = body?.amount != null ? Number(body.amount) : undefined;

  try {
    let ok = false;
    if (action === "approve") ok = await approveCommission(id);
    else if (action === "reject") ok = await rejectCommission(id, note);
    else if (action === "refund") ok = await refundCommission(id, amount, note);
    else if (action === "cancel") ok = await cancelCommission(id, note);
    else {
      return NextResponse.json(
        { error: "action must be approve | reject | refund | cancel" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    );
  }
}
