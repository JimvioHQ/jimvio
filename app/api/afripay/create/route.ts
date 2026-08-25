import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAfriPaySession } from "@/lib/afripay/afripay";
import { requireSessionUser, notFoundIfInvalidId } from "@/lib/auth/require-session";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionUser();
    if ("error" in session) return session.error;

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ success: false, message: "Missing Order ID" }, { status: 400 });
    }
    const bad = notFoundIfInvalidId(orderId);
    if (bad) return bad;

    const supabaseAdmin = createClient(
      getSupabaseUrl(),
      getSupabaseSecretKey()
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, total_amount, currency, status, payment_status")
      .eq("id", orderId)
      .eq("buyer_id", session.user.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    if (order.payment_status === "completed" || order.payment_status === "paid") {
      return NextResponse.json({ success: false, message: "Order already paid" }, { status: 400 });
    }

    // Force order to PENDING before generating session
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "pending" })
      .eq("id", order.id);

    if (updateError) {
       console.error("Failed setting order to pending", updateError);
       return NextResponse.json({ success: false, message: "Failed updating database" }, { status: 500 });
    }

    // STEP 3: PAYMENT FORM (Construct payload securely on backend, excluding secret)
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://jimvio.com";
    
    const checkoutData = await createAfriPaySession({
        amount: order.total_amount,
        currency: order.currency || "RWF",
        orderId: order.id, // Maps to client_token
        returnUrl: `${origin}/checkout/success?order=${order.id}`,
        cancelUrl: `${origin}/checkout/cancel?order=${order.id}`
    });

    // Return the form data so the frontend can create a hidden form and POST it safely to AfriPay
    return NextResponse.json({ 
       success: true, 
       checkout: checkoutData 
    });

  } catch (error: any) {
    console.error("AfriPay Create Session Error:", error.message);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
