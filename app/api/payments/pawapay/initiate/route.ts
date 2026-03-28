import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import {
  checkDepositStatus,
  formatPawaPayAmount,
  getPawaPayConfig,
  normalizePawaPayMsisdn,
  pawapayRequestJson,
  type PawaPayDepositInitBody,
  type PawaPayDepositInitResponse,
} from "@/lib/pawapay";
import { convertOrderToPawaPayCurrency } from "@/lib/pawapay-convert";
import { defaultCountryCallingCodeForShipping, getPawaPayProviderOptions } from "@/lib/pawapay-providers";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Postgres uuid type rejects malformed strings; PawaPay should return the same UUID we sent. */
function normalizeDepositUuid(fromApi: string | null | undefined, fallback: string): string {
  const s = (fromApi ?? "").trim();
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(s) ? s : fallback;
}

/** Avoid non-JSON values in metadata breaking PostgREST JSONB updates. */
function jsonSafeMetadata(meta: unknown): Record<string, unknown> {
  try {
    const o = meta && typeof meta === "object" ? meta : {};
    return JSON.parse(JSON.stringify(o)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    getPawaPayConfig();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "PawaPay not configured" }, { status: 500 });
  }

  try {
    const body = (await req.json()) as {
      orderId?: string;
      provider?: string;
      phoneNumber?: string;
    };
    const orderId = body.orderId?.trim();
    const provider = body.provider?.trim();
    const phoneNumber = body.phoneNumber?.trim();
    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    if (!provider) return NextResponse.json({ error: "Missing provider (MMO code)" }, { status: 400 });
    if (!phoneNumber) return NextResponse.json({ error: "Missing phoneNumber" }, { status: 400 });

    const options = getPawaPayProviderOptions();
    const provMeta = options.find((p) => p.id === provider);
    if (!provMeta) {
      return NextResponse.json({ error: "Invalid provider for this site configuration" }, { status: 400 });
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, currency, shipping_address, buyer_id, pawapay_deposit_id, payment_status, metadata")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status === "completed") {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    const orderCurrency = (order.currency || "USD").toUpperCase();
    const orderAmount = Number(order.total_amount);
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      return NextResponse.json({ error: "Invalid order amount" }, { status: 400 });
    }

    let conv: ReturnType<typeof convertOrderToPawaPayCurrency>;
    try {
      conv = convertOrderToPawaPayCurrency(orderAmount, orderCurrency, provMeta.currency);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Currency conversion not supported for PawaPay" },
        { status: 400 }
      );
    }

    const amount = conv.amount;
    const currency = conv.currency;

    const ship = order.shipping_address as { country_code?: string; phone?: string } | null;
    const cc = defaultCountryCallingCodeForShipping(ship?.country_code);
    const msisdn = normalizePawaPayMsisdn(phoneNumber, cc);
    if (msisdn.length < 10) {
      return NextResponse.json({ error: "Enter a valid mobile number with country code" }, { status: 400 });
    }

    const depositId = randomUUID();
    const amountStr = formatPawaPayAmount(amount);

    const payload: PawaPayDepositInitBody = {
      depositId,
      amount: amountStr,
      currency,
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: msisdn,
          provider,
        },
      },
      clientReferenceId: orderId,
      customerMessage: `Order ${order.order_number || orderId.slice(0, 8)}`.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 22) || "Jimvio order",
    };

    const init = await pawapayRequestJson<PawaPayDepositInitResponse>("/v2/deposits", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (init.status === "REJECTED") {
      const msg = init.failureReason?.failureMessage || init.failureReason?.failureCode || "Deposit rejected";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const resolvedDepositId = normalizeDepositUuid(init.depositId, depositId);

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      return NextResponse.json(
        { error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set." },
        { status: 500 }
      );
    }

    const meta = jsonSafeMetadata(order.metadata);
    const mergedMetadata = {
      ...meta,
      pawapay_charge: {
        order_amount: orderAmount,
        order_currency: orderCurrency,
        charge_amount: amount,
        charge_currency: currency,
        converted: conv.converted,
        note: conv.note,
      },
    };

    const now = new Date().toISOString();
    const corePatch = {
      pawapay_deposit_id: resolvedDepositId,
      payment_provider: "pawapay" as const,
      gateway_used: "pawapay" as const,
      updated_at: now,
    };

    /** Prefer one round-trip; if it fails (often bad metadata), save core fields then metadata separately. */
    const { error: fullErr } = await supabase
      .from("orders")
      .update({
        ...corePatch,
        metadata: mergedMetadata,
      })
      .eq("id", orderId);

    let metadataWarning: string | undefined;

    if (fullErr) {
      console.warn("[PawaPay initiate] full order update failed, retrying core columns only", fullErr);

      const { error: coreErr } = await supabase.from("orders").update(corePatch).eq("id", orderId);

      if (coreErr) {
        console.error("[PawaPay initiate] core order update failed", coreErr);
        const pe = coreErr as { message: string; code?: string; hint?: string; details?: string };
        const code = pe.code;
        const isRls =
          pe.message?.includes("permission denied") ||
          pe.message?.includes("row-level security") ||
          code === "42501";
        return NextResponse.json(
          {
            error: isRls
              ? "Could not update order (database permission). Use SUPABASE_SERVICE_ROLE_KEY from the same Supabase project as NEXT_PUBLIC_SUPABASE_URL (Settings → API → service_role)."
              : "PawaPay accepted the payment request but we could not save the order. Check details.",
            details: pe.details || pe.message,
            code,
            hint: pe.hint,
            firstError: (fullErr as { message?: string }).message,
          },
          { status: 500 }
        );
      }

      const { error: metaErr } = await supabase
        .from("orders")
        .update({ metadata: mergedMetadata, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (metaErr) {
        console.error("[PawaPay initiate] metadata-only update failed (deposit id was saved)", metaErr);
        metadataWarning =
          "PawaPay deposit is linked on this order, but charge details could not be written to metadata. Check server logs.";
      }
    }

    if (init.status === "DUPLICATE_IGNORED" && resolvedDepositId) {
      const st = await checkDepositStatus(resolvedDepositId);
      return NextResponse.json({
        status: init.status,
        depositId: resolvedDepositId,
        remoteStatus: st.status,
        message: "Duplicate request — see remoteStatus",
      });
    }

    return NextResponse.json({
      status: init.status,
      depositId: resolvedDepositId,
      sandbox: getPawaPayConfig().isSandbox,
      chargeAmount: amount,
      chargeCurrency: currency,
      orderAmount: orderAmount,
      orderCurrency: orderCurrency,
      converted: conv.converted,
      warn: metadataWarning,
      message:
        init.status === "ACCEPTED"
          ? "Payment initiated. Approve the request on your phone to complete."
          : undefined,
    });
  } catch (err) {
    console.error("[PawaPay initiate]", err);
    const message = err instanceof Error && err.message ? err.message : "Payment initiation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
