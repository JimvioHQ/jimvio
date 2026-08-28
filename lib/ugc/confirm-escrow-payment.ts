import type { SupabaseClient } from "@supabase/supabase-js";
import { emitUgcEvent } from "@/lib/ugc/enterprise/events";
import { assertCampaignReadyForFunding } from "@/lib/ugc/campaign-wizard-validation";

const MIN_FUNDING_RWF = 1000;

type ConfirmOpts = {
  paymentRef?: string | null;
  providerTransactionId?: string | null;
  campaignId?: string | null;
  amount?: number | null;
  currency?: string | null;
  provider?: string | null;
};

type ConfirmResult =
  | { handled: false }
  | { handled: true; activated: boolean; campaignId: string; alreadyHeld: boolean };

/**
 * Moves a pending UGC escrow to held and activates the campaign after a
 * verified provider confirmation. Safe to call repeatedly.
 */
export async function confirmUgcEscrowPayment(
  db: SupabaseClient,
  opts: ConfirmOpts,
): Promise<ConfirmResult> {
  const refs = [opts.paymentRef, opts.providerTransactionId, opts.campaignId]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  let campaignId = opts.campaignId?.trim() || "";

  if (!campaignId) {
    const keys = [opts.paymentRef, opts.providerTransactionId].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    for (const key of keys) {
      const { data: tx } = await db
        .from("transactions")
        .select("reference, metadata, type")
        .eq("type", "ugc_escrow")
        .eq("provider_transaction_id", key)
        .maybeSingle();
      const meta = (tx?.metadata ?? {}) as { campaign_id?: string; purpose?: string };
      if (tx?.reference) {
        campaignId = String(meta.campaign_id || tx.reference);
        break;
      }
    }
  }

  if (!campaignId && refs.length) {
    for (const key of refs) {
      const { data: escrowByRef } = await db
        .from("ugc_campaign_escrow")
        .select("campaign_id, status, amount, currency")
        .eq("payment_ref", key)
        .maybeSingle();
      if (escrowByRef?.campaign_id) {
        campaignId = escrowByRef.campaign_id;
        break;
      }
    }
  }

  if (!campaignId) return { handled: false };

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return { handled: false };

  const { data: escrow } = await db
    .from("ugc_campaign_escrow")
    .select("id, amount, currency, status, payment_ref")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!escrow) return { handled: false };

  const ready = assertCampaignReadyForFunding(campaign);
  const canActivate = ready.success;

  const expected = Number(escrow.amount ?? 0);
  const escrowCurrency = String(escrow.currency ?? "RWF").toUpperCase();
  const paidCurrency = opts.currency ? String(opts.currency).toUpperCase() : null;
  if (paidCurrency && paidCurrency === escrowCurrency && opts.amount != null && Number.isFinite(Number(opts.amount))) {
    const paid = Number(opts.amount);
    if (paid + 0.009 < expected) {
      return { handled: true, activated: false, campaignId, alreadyHeld: false };
    }
  }

  if (escrow.status === "held") {
    if (canActivate && campaign.status !== "active") {
      await db.from("ugc_campaigns").update({ status: "active" }).eq("id", campaignId);
    }
    return { handled: true, activated: canActivate, campaignId, alreadyHeld: true };
  }

  const now = new Date().toISOString();
  const paymentRef = opts.paymentRef || opts.providerTransactionId || escrow.payment_ref;
  const { data: updated } = await db
    .from("ugc_campaign_escrow")
    .update({
      status: "held",
      locked_amount: expected,
      deposited_at: now,
      payment_ref: paymentRef,
      ...(opts.provider ? { payment_method: opts.provider } : {}),
    })
    .eq("id", escrow.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!updated) {
    const { data: again } = await db
      .from("ugc_campaign_escrow")
      .select("status")
      .eq("id", escrow.id)
      .maybeSingle();
    if (again?.status === "held") {
      if (canActivate) {
        await db.from("ugc_campaigns").update({ status: "active" }).eq("id", campaignId);
      }
      return { handled: true, activated: canActivate, campaignId, alreadyHeld: true };
    }
    return { handled: true, activated: false, campaignId, alreadyHeld: false };
  }

  await db.from("transactions")
    .update({ status: "completed" })
    .eq("type", "ugc_escrow")
    .eq("reference", campaignId)
    .eq("status", "pending");

  if (canActivate) {
    await db.from("ugc_campaigns").update({ status: "active" }).eq("id", campaignId);
  }

  try {
    await emitUgcEvent(db, campaign.brand_id, "campaign.funded", {
      campaignId,
      amount: expected,
      currency: escrow.currency ?? "RWF",
    });
  } catch {
    /* never fail confirmation */
  }

  void MIN_FUNDING_RWF;
  return { handled: true, activated: canActivate, campaignId, alreadyHeld: false };
}

/** Shared hook for provider webhooks/callbacks. Never activates on unverified events. */
export async function confirmUgcEscrowFromProviderEvent(
  db: SupabaseClient,
  event: {
    provider?: string | null;
    providerTransactionId?: string | null;
    txRef?: string | null;
    campaignId?: string | null;
    amount?: number | null;
    currency?: string | null;
    rawBody?: string | null;
  },
): Promise<ConfirmResult> {
  let txRef = event.txRef ?? null;
  if (!txRef && event.rawBody && event.provider === "flutterwave") {
    try {
      const body = JSON.parse(event.rawBody) as Record<string, unknown>;
      const data = body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : null;
      const ev = body.event && typeof body.event === "object" ? (body.event as Record<string, unknown>) : null;
      txRef =
        (typeof data?.tx_ref === "string" ? data.tx_ref : null) ??
        (typeof ev?.tx_ref === "string" ? ev.tx_ref : null) ??
        (typeof ev?.txRef === "string" ? ev.txRef : null) ??
        (typeof body.tx_ref === "string" ? body.tx_ref : null);
    } catch {
      txRef = null;
    }
  }
  return confirmUgcEscrowPayment(db, {
    paymentRef: txRef,
    providerTransactionId: event.providerTransactionId ?? txRef,
    campaignId: event.campaignId,
    amount: event.amount,
    currency: event.currency,
    provider: event.provider,
  });
}
