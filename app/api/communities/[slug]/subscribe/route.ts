import { NextRequest, NextResponse } from "next/server";
import { accessPlans, isAccessPlanKey } from "@/lib/community/access-pricing";
import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/lib/supabase/admin";

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

  const { planType, paymentProvider = "flutterwave" } = (await req.json()) as {
    planType?: string;
    paymentProvider?: string;
  };

  if (!planType || !isAccessPlanKey(planType)) {
    return NextResponse.json({ error: "Invalid planType" }, { status: 400 });
  }

  const provider = (paymentProvider || "flutterwave").toLowerCase();
  if (
    provider === "pesapal" ||
    provider === "paypal" ||
    provider === "pawapay" ||
    provider === "afripay"
  ) {
    return NextResponse.json(
      { error: "This payment provider is no longer available. Please choose another method." },
      { status: 410 },
    );
  }

  const { data: community } = await supabase
    .from("communities")
    .select(
      "id, name, is_free, weekly_price, monthly_price, quarterly_price, yearly_price, lifetime_price, currency",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only plans the owner currently sells can be bought.
  const amount =
    community.is_free === true ? null : (accessPlans(community).find((p) => p.key === planType)?.price ?? null);
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid plan or price" }, { status: 400 });
  }

  const admin = getAdminDB();

  const { data: pendingOrders } = await admin
    .from("orders")
    .select("id, metadata")
    .eq("buyer_id", user.id)
    .eq("integration_source", "community")
    .eq("payment_status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  const pendingOrder = pendingOrders?.find((row) => {
    const meta = row.metadata as { community_id?: string; plan_type?: string } | null;
    return meta?.community_id === community.id && meta?.plan_type === planType;
  });

  let orderId = pendingOrder?.id as string | undefined;

  if (!orderId) {
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        buyer_id: user.id,
        total_amount: amount,
        subtotal: amount,
        currency: community.currency || "USD",
        status: "checkout_direct",
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
      const msg = orderErr?.message ?? "Order create failed";
      console.error("[community/subscribe] order insert failed:", msg);
      return NextResponse.json(
        { error: "Unable to start checkout. Please try again." },
        { status: 400 }
      );
    }
    orderId = order.id;
  }

  if (provider === "wallet") {
    const { payOrderWithWallet } = await import("@/lib/payments/pay-order-with-wallet");
    const result = await payOrderWithWallet(user.id, orderId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.code ? { code: result.code } : {}) },
        { status: result.status },
      );
    }
    return NextResponse.json({
      success: true,
      paidWithWallet: true,
      redirectUrl: `/communities/${slug}`,
    });
  }

  const base = appBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not set (needed to call payment APIs)" },
      { status: 500 }
    );
  }

  const path =
    provider === "nowpayments"
      ? `${base}/api/payments/nowpayments/initiate`
      : provider === "binancepay"
        ? `${base}/api/payments/binancepay/initiate`
        : `${base}/api/payments/flutterwave/initiate`;

  const paymentRes = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });

  const paymentData = (await paymentRes.json()) as Record<string, unknown>;
  if (!paymentRes.ok) {
    return NextResponse.json(
      { error: (paymentData.error as string) || "Payment initiation failed" },
      { status: paymentRes.status }
    );
  }

  return NextResponse.json(paymentData);
}
