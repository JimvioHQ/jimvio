import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkDepositStatus, getPawaPayConfig } from "@/lib/pawapay";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

export const dynamic = "force-dynamic";

const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** PawaPay / TLS sometimes drops the connection (ECONNRESET); retry before failing the poll. */
function isTransientUpstreamError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /econnreset|etimedout|fetch failed|socket|network|timeout|aborted|ECONNRESET|ENOTFOUND/i.test(msg);
}

async function checkDepositStatusWithRetry(depositId: string): Promise<Awaited<ReturnType<typeof checkDepositStatus>>> {
  const delaysMs = [0, 400, 900];
  let last: unknown;
  for (let i = 0; i < delaysMs.length; i++) {
    if (delaysMs[i] > 0) {
      await new Promise((r) => setTimeout(r, delaysMs[i]));
    }
    try {
      return await checkDepositStatus(String(depositId));
    } catch (e) {
      last = e;
      if (!isTransientUpstreamError(e) || i === delaysMs.length - 1) {
        throw e;
      }
    }
  }
  throw last;
}

/**
 * Lets the buyer poll PawaPay deposit status and finalize the order when COMPLETED.
 * Needed when webhooks cannot reach the app (e.g. localhost) — the dashboard callback never runs.
 */
export async function POST(req: NextRequest) {
  try {
    getPawaPayConfig();
  } catch {
    return NextResponse.json({ error: "PawaPay not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = (await req.json()) as { orderId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_id, payment_status, payment_provider, pawapay_deposit_id")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.payment_status === "completed") {
    return NextResponse.json({ payment_status: "completed", done: true });
  }

  const depositId = order.pawapay_deposit_id;

  if (!depositId) {
    if (order.payment_provider === "pawapay") {
      return NextResponse.json({
        payment_status: order.payment_status,
        pawapay: true,
        missingDepositId: true,
      });
    }
    return NextResponse.json({ payment_status: order.payment_status, pawapay: false });
  }

  let remote: Awaited<ReturnType<typeof checkDepositStatus>>;
  try {
    remote = await checkDepositStatusWithRetry(String(depositId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PawaPay status check failed";
    return NextResponse.json(
      {
        error: msg,
        pawapay: true,
        /** Client can keep polling — upstream was temporarily unreachable */
        transient: isTransientUpstreamError(e),
      },
      { status: 502 }
    );
  }

  const st = (remote.status || "").toUpperCase();

  if (st === "FAILED" || st === "REJECTED" || st === "CANCELLED") {
    const fr = remote.failureReason;
    return NextResponse.json({
      payment_status: order.payment_status,
      depositStatus: remote.status ?? st,
      pawapay: true,
      terminalFailure: true,
      failureCode: fr?.failureCode ?? null,
      failureMessage: fr?.failureMessage ?? null,
    });
  }

  if (st !== "COMPLETED") {
    return NextResponse.json({
      payment_status: order.payment_status,
      depositStatus: remote.status ?? null,
      pawapay: true,
    });
  }

  try {
    await finalizeOrderPayment(admin, orderId, {
      providerTransactionId: String(depositId),
      providerReference: String(depositId),
      paidAtIso: new Date().toISOString(),
      notifyUserId: user.id,
      amountForMessage: null,
      webhookReference: String(depositId),
      paymentProvider: "pawapay",
    });
  } catch (e) {
    console.error("[PawaPay sync-status] finalize", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not finalize order" },
      { status: 500 }
    );
  }

  return NextResponse.json({ payment_status: "completed", done: true, synced: true });
}
