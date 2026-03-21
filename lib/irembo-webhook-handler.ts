import { createClient } from "@supabase/supabase-js";
import { iremboPay } from "@/services/payments/irembopay";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

const supabase = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

function parseOrderIdsFromTransaction(metadata: unknown, orderId: string | null): string[] {
  const meta = metadata as { order_ids?: string[] } | null | undefined;
  if (meta?.order_ids && Array.isArray(meta.order_ids) && meta.order_ids.length > 0) {
    return meta.order_ids.filter((id): id is string => typeof id === "string");
  }
  if (orderId) return [orderId];
  return [];
}

export async function processIremboWebhookRequest(body: string, signatureHeader: string): Promise<{
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}> {
  if (!iremboPay.verifyWebhookSignature(body, signatureHeader)) {
    return { ok: false, status: 401, body: { error: "Invalid signature" } };
  }

  const payload = JSON.parse(body) as {
    transactionId?: string;
    reference?: string;
    status?: string;
    amount?: number;
    paidAt?: string;
    metadata?: { jimvio_order_id?: string; jimvio_order_ids?: string };
    paymentAccountNumber?: string;
  };

  const { transactionId, reference, status, amount, paidAt, metadata, paymentAccountNumber } = payload;

  if (!reference) {
    return { ok: false, status: 400, body: { error: "Missing reference" } };
  }

  const db = supabase();

  const paymentStatus =
    status === "completed" ? "completed" : status === "failed" ? "failed" : status === "cancelled" ? "cancelled" : "processing";

  await db
    .from("transactions")
    .update({
      status: paymentStatus,
      provider_transaction_id: transactionId,
      provider_reference: reference,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", reference);

  if (status !== "completed") {
    return { ok: true, status: 200, body: { received: true } };
  }

  const { data: transaction } = await db
    .from("transactions")
    .select("order_id, user_id, metadata")
    .eq("reference", reference)
    .single();

  if (!transaction) {
    return { ok: true, status: 200, body: { received: true } };
  }

  let orderIds = parseOrderIdsFromTransaction(transaction.metadata, transaction.order_id);

  if (orderIds.length === 0 && metadata?.jimvio_order_ids) {
    orderIds = metadata.jimvio_order_ids.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (orderIds.length === 0 && metadata?.jimvio_order_id) {
    orderIds = [metadata.jimvio_order_id];
  }

  if (orderIds.length === 0) {
    return { ok: true, status: 200, body: { received: true } };
  }

  const paidAtIso = paidAt || new Date().toISOString();
  const iremboRef = transactionId || reference;
  const paymentRefDisplay = paymentAccountNumber ?? reference;

  const results: string[] = [];
  for (const orderId of orderIds) {
    try {
      const r = await finalizeOrderPayment(db, orderId, {
        providerTransactionId: iremboRef,
        providerReference: paymentRefDisplay,
        paidAtIso,
        notifyUserId: transaction.user_id,
        amountForMessage: amount ?? null,
        webhookReference: reference,
      });
      results.push(r.type);
    } catch (e) {
      console.error("Irembo webhook finalize error", orderId, e);
    }
  }

  return { ok: true, status: 200, body: { received: true, processed: results } };
}
