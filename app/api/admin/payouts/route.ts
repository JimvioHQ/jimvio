import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { notifyUser } from "@/lib/notifications/notify-user";

import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
const service = () =>
  createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";

  const db = service();
  const { data: payouts, error } = await db
    .from("payouts")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((payouts ?? []).map((p) => p.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await db.from("profiles").select("id, full_name, email, phone").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null; phone: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const enriched = (payouts ?? []).map((p) => ({
    ...p,
    profiles: profileById.get(p.user_id) ?? null,
  }));

  return NextResponse.json({ payouts: enriched });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const body = (await req.json()) as {
    payoutId?: string;
    action?: "approve" | "reject";
    providerReference?: string | null;
    rejectReason?: string | null;
  };
  const payoutId = body.payoutId;
  const action = body.action;
  if (!payoutId || !action) {
    return NextResponse.json({ error: "payoutId and action required" }, { status: 400 });
  }

  const db = service();

  const { data: payout, error: pErr } = await db.from("payouts").select("*").eq("id", payoutId).single();
  if (pErr || !payout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }

  if (payout.status !== "pending") {
    return NextResponse.json({ error: "Only pending payouts can be updated" }, { status: 400 });
  }

  const newStatus = action === "approve" ? "paid" : "failed";

  const rejectNote =
    action === "reject" && body.rejectReason?.trim()
      ? [payout.notes, `Rejected: ${body.rejectReason.trim()}`].filter(Boolean).join("\n")
      : payout.notes;

  const { error: u1 } = await db
    .from("payouts")
    .update({
      status: newStatus,
      provider_reference: body.providerReference ?? payout.provider_reference,
      notes: rejectNote ?? payout.notes,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payoutId);

  if (u1) {
    return NextResponse.json({ error: u1.message }, { status: 500 });
  }

  const { data: payoutTxRows } = await db
    .from("transactions")
    .select("id, metadata, reference, type, status")
    .eq("user_id", payout.user_id)
    .in("type", ["payout_request", "wallet_withdrawal", "vendor_withdrawal"])
    .eq("status", "pending");

  const matchingTxIds = (payoutTxRows ?? [])
    .filter((t) => {
      const meta = t.metadata as {
        payout_id?: string;
        payout?: { id?: string };
      } | null;
      if (meta?.payout_id === payout.id) return true;
      if (meta?.payout?.id === payout.id) return true;
      if (
        payout.provider_reference &&
        t.reference &&
        t.reference === payout.provider_reference
      ) {
        return true;
      }
      return false;
    })
    .map((t) => t.id);

  if (action === "approve") {
    const { data: wallet } = await db
      .from("wallets")
      .select("total_paid, pending_balance")
      .eq("user_id", payout.user_id)
      .single();
    if (wallet) {
      const pend = Number(wallet.pending_balance ?? 0);
      const amt = Number(payout.amount);
      await db
        .from("wallets")
        .update({
          total_paid: Number(wallet.total_paid) + amt,
          // Clear reserved pending funds for CAS withdrawals
          pending_balance: Math.max(0, pend - amt),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", payout.user_id);
    }

    if (matchingTxIds.length > 0) {
      await db
        .from("transactions")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .in("id", matchingTxIds);
    }
  }

  if (action === "reject") {
    const { data: wallet } = await db
      .from("wallets")
      .select("available_balance, pending_balance")
      .eq("user_id", payout.user_id)
      .single();
    if (wallet) {
      const amt = Number(payout.amount);
      const pend = Number(wallet.pending_balance ?? 0);
      // Release reservation: pending → available (Wallet OS CAS path)
      await db
        .from("wallets")
        .update({
          available_balance: Number(wallet.available_balance) + amt,
          pending_balance: Math.max(0, pend - amt),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", payout.user_id);
    }

    if (matchingTxIds.length > 0) {
      await db
        .from("transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .in("id", matchingTxIds);
    }
  }

  await notifyUser(db, {
    userId: payout.user_id,
    type: "payment",
    title: action === "approve" ? "Payout sent" : "Payout update",
    message:
      action === "approve"
        ? "Your payout was marked paid."
        : "Your payout was not sent. Reserved funds were returned to your available balance.",
    actionUrl: "/wallet/withdrawals",
    eventKey: `payout.${newStatus}:${payoutId}`,
    email: {
      kind: action === "approve" ? "payout_sent" : "payout_failed",
      amount: Number(payout.amount),
      currency: String(payout.currency ?? "USD"),
      reason: action === "reject" ? body.rejectReason?.trim() || undefined : undefined,
      idempotencyKey: `payout.${newStatus}:${payoutId}`,
    },
  });

  return NextResponse.json({ success: true, status: newStatus });
}
