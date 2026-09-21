import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

/**
 * POST /api/wallet/os/deposits/[id]/cancel
 * Cancel a pending (or unpaid processing) deposit owned by the caller.
 * Never credits the wallet. Idempotent.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: depositId } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      depositId,
    )
  ) {
    return NextResponse.json({ error: "Invalid deposit id" }, { status: 400 });
  }

  const db = createServiceRoleClient();

  const { data: deposit } = await db
    .from("wallet_deposits")
    .select("id, user_id, status, amount, currency, method, reference")
    .eq("id", depositId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!deposit) {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  if (deposit.status === "cancelled") {
    return NextResponse.json({
      ok: true,
      depositId,
      status: "cancelled",
      duplicate: true,
    });
  }

  if (deposit.status === "completed") {
    return NextResponse.json(
      {
        error: "This deposit has already been completed and cannot be cancelled.",
        code: "NOT_CANCELLABLE",
      },
      { status: 409 },
    );
  }

  if (deposit.status === "failed") {
    return NextResponse.json(
      {
        error: "This deposit has already failed.",
        code: "NOT_CANCELLABLE",
      },
      { status: 409 },
    );
  }

  if (deposit.status !== "pending" && deposit.status !== "processing") {
    return NextResponse.json(
      {
        error: "Only pending deposits can be cancelled.",
        code: "NOT_CANCELLABLE",
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await db
    .from("wallet_deposits")
    .update({ status: "cancelled" })
    .eq("id", depositId)
    .eq("user_id", user.id)
    .in("status", ["pending", "processing"])
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    console.error("[deposit/cancel] update failed", {
      code: updateError.code,
      depositId,
    });
    return NextResponse.json({ error: "Could not cancel deposit" }, { status: 500 });
  }

  if (!updated) {
    // Race: status changed between read and update
    const { data: fresh } = await db
      .from("wallet_deposits")
      .select("status")
      .eq("id", depositId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (fresh?.status === "completed") {
      return NextResponse.json(
        {
          error: "This deposit was completed while cancelling. It cannot be cancelled.",
          code: "RACE_COMPLETED",
        },
        { status: 409 },
      );
    }
    if (fresh?.status === "cancelled") {
      return NextResponse.json({ ok: true, depositId, status: "cancelled", duplicate: true });
    }
    return NextResponse.json(
      { error: "Could not cancel deposit", code: "NOT_CANCELLABLE" },
      { status: 409 },
    );
  }

  // Mark matching pending ledger rows failed (never credit).
  if (deposit.reference) {
    await db
      .from("transactions")
      .update({ status: "failed", updated_at: now })
      .eq("user_id", user.id)
      .eq("provider_transaction_id", deposit.reference)
      .eq("status", "pending")
      .eq("type", "wallet_deposit");
  }

  console.info("[deposit/cancel] cancelled", {
    depositId,
    userId: user.id,
    method: deposit.method,
  });

  return NextResponse.json({
    ok: true,
    depositId,
    status: "cancelled",
  });
}
