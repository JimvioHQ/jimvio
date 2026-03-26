import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planType, paymentProvider = "pesapal", pawapayProvider, pawapayPhone } = (await req.json()) as {
    planType?: string;
    paymentProvider?: string;
    pawapayProvider?: string;
    pawapayPhone?: string;
  };

  if (!planType || !["monthly", "yearly", "lifetime"].includes(planType)) {
    return NextResponse.json({ error: "Invalid planType" }, { status: 400 });
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, name, monthly_price, yearly_price, lifetime_price, currency")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const priceMap: Record<string, number | null> = {
    monthly: community.monthly_price != null ? Number(community.monthly_price) : null,
    yearly: community.yearly_price != null ? Number(community.yearly_price) : null,
    lifetime: community.lifetime_price != null ? Number(community.lifetime_price) : null,
  };
  const amount = priceMap[planType];
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid plan or price" }, { status: 400 });
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      total_amount: amount,
      subtotal: amount,
      currency: community.currency || "USD",
      status: "pending",
      payment_status: "pending",
      integration_source: "community",
      metadata: {
        community_id: community.id,
        plan_type: planType,
        community_name: community.name,
      },
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: orderErr?.message ?? "Order create failed" }, { status: 400 });
  }

  const base = appBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not set (needed to call payment APIs)" },
      { status: 500 }
    );
  }

  if (paymentProvider === "pawapay") {
    if (!pawapayProvider?.trim() || !pawapayPhone?.trim()) {
      return NextResponse.json({ error: "pawapayProvider and pawapayPhone are required for PawaPay" }, { status: 400 });
    }
  }

  const path =
    paymentProvider === "nowpayments"
      ? `${base}/api/payments/nowpayments/initiate`
      : paymentProvider === "pawapay"
        ? `${base}/api/payments/pawapay/initiate`
        : `${base}/api/payments/pesapal/initiate`;

  const paymentBody =
    paymentProvider === "pawapay"
      ? JSON.stringify({
          orderId: order.id,
          provider: pawapayProvider?.trim(),
          phoneNumber: pawapayPhone?.trim(),
        })
      : JSON.stringify({ orderId: order.id });

  const paymentRes = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: paymentBody,
  });

  const paymentData = (await paymentRes.json()) as Record<string, unknown>;
  if (!paymentRes.ok) {
    return NextResponse.json(
      { error: (paymentData.error as string) || "Payment initiation failed" },
      { status: paymentRes.status }
    );
  }

  if (paymentProvider === "pawapay") {
    return NextResponse.json({
      ...paymentData,
      pendingUrl: `${base}/checkout/pending?orderId=${encodeURIComponent(order.id)}`,
    });
  }

  return NextResponse.json(paymentData);
}
