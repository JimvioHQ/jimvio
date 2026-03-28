import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Body = {
  transactionId?: string;
  status?: string;
};

/**
 * TODO: Add AfriPay signature verification once their webhook docs are confirmed.
 */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const transactionId = body.transactionId?.trim();
  if (!transactionId) {
    return NextResponse.json({ error: "missing transactionId" }, { status: 400 });
  }

  const st = (body.status || "").toLowerCase();

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("payment_external_reference", transactionId)
    .maybeSingle();

  if (!order) {
    console.warn("[webhooks/afripay] no order for transactionId", transactionId);
    return NextResponse.json({ received: true });
  }

  if (order.payment_status === "completed") {
    return NextResponse.json({ received: true });
  }

  if (st === "failed" || st === "cancelled") {
    await supabase
      .from("orders")
      .update({ payment_status: "failed", gateway_used: "afripay" })
      .eq("id", order.id);
    return NextResponse.json({ received: true });
  }

  if (st === "success" || st === "completed" || st === "paid") {
    await supabase.from("orders").update({ gateway_used: "afripay" }).eq("id", order.id);
  }

  return NextResponse.json({ received: true });
}
