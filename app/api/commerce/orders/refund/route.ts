import { NextRequest, NextResponse } from "next/server";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";
import { refundFlutterwaveTransaction } from "@/lib/flutterwave";

export const dynamic = "force-dynamic";

/**
 * Initiate a provider refund for a paid store order.
 * Currently automated for Flutterwave captured payments only.
 * Other providers return a clear manual/provider-required boundary.
 */
export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    orderId?: string;
    reason?: string;
    amount?: number;
  } | null;

  if (!body?.storeId || !body?.orderId) {
    return NextResponse.json(
      { error: "storeId and orderId are required." },
      { status: 400 },
    );
  }

  const db = cosAdminDb();
  if (!(await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId))) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data: order } = await db
    .from("orders")
    .select(
      "id, jimvio_store_id, payment_status, status, total_amount, currency, metadata",
    )
    .eq("id", body.orderId)
    .eq("jimvio_store_id", body.storeId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const pay = String(order.payment_status || "").toLowerCase();
  if (!["paid", "completed", "success"].includes(pay)) {
    return NextResponse.json(
      { error: "Only paid orders can be refunded." },
      { status: 409 },
    );
  }
  if (pay === "refunded" || String(order.status || "").toLowerCase() === "refunded") {
    return NextResponse.json({ ok: true, alreadyRefunded: true });
  }

  const { data: tx } = await db
    .from("transactions")
    .select(
      "id, reference, amount, currency, status, metadata, provider, provider_transaction_id",
    )
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const meta =
    order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? (order.metadata as Record<string, unknown>)
      : {};
  const txMeta =
    tx?.metadata && typeof tx.metadata === "object" && !Array.isArray(tx.metadata)
      ? (tx.metadata as Record<string, unknown>)
      : {};

  const provider = String(
    tx?.provider ||
      meta.payment_provider ||
      meta.provider ||
      txMeta.provider ||
      "",
  ).toLowerCase();

  const flwId =
    tx?.provider_transaction_id ||
    txMeta.flutterwave_transaction_id ||
    txMeta.flw_ref ||
    txMeta.transaction_id ||
    meta.flutterwave_transaction_id ||
    meta.flw_tx_id;

  if (provider.includes("flutterwave") || provider === "card" || flwId) {
    if (!flwId) {
      return NextResponse.json(
        {
          error:
            "Flutterwave transaction reference is missing. Refund must be completed in the provider dashboard.",
          code: "PROVIDER_MANUAL_REQUIRED",
        },
        { status: 409 },
      );
    }

    try {
      const amount =
        typeof body.amount === "number" && Number.isFinite(body.amount)
          ? body.amount
          : undefined;
      const result = await refundFlutterwaveTransaction(String(flwId), amount);
      const ok =
        String(result.status || "").toLowerCase() === "completed" ||
        String(result.status || "").toLowerCase() === "successful" ||
        Boolean(result.id);

      if (!ok) {
        return NextResponse.json(
          {
            error: "Provider did not confirm the refund.",
            code: "PROVIDER_PENDING",
            providerStatus: result.status,
          },
          { status: 502 },
        );
      }

      await db
        .from("orders")
        .update({
          payment_status: "refunded",
          status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("jimvio_store_id", body.storeId);

      return NextResponse.json({
        ok: true,
        provider: "flutterwave",
        providerReference: String(result.id),
        providerStatus: result.status,
        orderId: order.id,
      });
    } catch (err) {
      console.error("[commerce/refund] flutterwave:", err);
      return NextResponse.json(
        {
          error:
            "Flutterwave refund failed. Confirm the payment in Flutterwave and try again.",
          code: "PROVIDER_ERROR",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      error:
        "Automatic refunds for this payment provider are not available in Commerce OS yet. Complete the refund in the provider dashboard, then payment webhooks will update the order when confirmed.",
      code: "PROVIDER_MANUAL_REQUIRED",
      provider: provider || "unknown",
    },
    { status: 409 },
  );
}
