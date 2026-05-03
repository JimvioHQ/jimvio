// app/api/orders/[orderId]/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";

const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await params;

    const cookieStore = await cookies();

    const userSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => cookieStore.get(name)?.value,
            },
        }
    );

    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await serviceSupabase
        .from("orders")
        .select("id, payment_status, status, paid_at, flutterwave_transaction_id, payment_provider")
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (data.payment_status === "pending") {
        const txData = await verifyFlutterwaveTransaction(data.id);
        console.log({ txData });
    }

    return NextResponse.json({
        paymentStatus: data.payment_status,
        orderStatus: data.status,
        paidAt: data.paid_at,
        transactionId: data.flutterwave_transaction_id,
        provider: data.payment_provider,
    });
}