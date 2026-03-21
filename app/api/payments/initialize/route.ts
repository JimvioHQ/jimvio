import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { iremboPay } from "@/services/payments/irembopay";
import { z } from "zod";

const initPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { orderId, amount, description } = initPaymentSchema.parse(body);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", user.id)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const result = await iremboPay.initializePayment({
      amount,
      currency: "RWF",
      orderId,
      description,
      customerEmail: profile?.email || user.email!,
      customerName: profile?.full_name || undefined,
      customerPhone: profile?.phone || undefined,
      callbackUrl: `${baseUrl}/api/payments/webhook`,
      returnUrl: `${baseUrl}/dashboard/orders/${orderId}?checkout=irembo`,
      metadata: { jimvio_order_ids: orderId },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await supabase.from("transactions").insert({
      user_id: user.id,
      reference: result.data!.reference,
      type: "order_payment",
      amount,
      currency: "RWF",
      status: "pending",
      provider: "irembopay",
      provider_transaction_id: result.data!.transactionId,
      description,
      order_id: orderId,
      metadata: { order_ids: [orderId] },
    });

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }
    console.error("Payment init error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
