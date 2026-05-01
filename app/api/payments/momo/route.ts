// /app/api/payments/momo/route.ts

import { redirect } from "next/dist/server/api-utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const res = await fetch(
            "https://api.flutterwave.com/v3/charges?type=mobile_money_rwanda",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    phone_number: body.phone,
                    amount: body.amount,
                    currency: "RWF",
                    redirect_url: "http://localhost:3000/test/payment-success",
                    email: body.email,
                    fullname: body.name || "Customer",
                    tx_ref: `tx-${Date.now()}`,
                    network: "MTN",
                }),
            }
        );

        const data = await res.json();

        console.log("Flutterwave response:", data);

        // ❌ If failed
        if (data.status !== "success") {
            return NextResponse.json(
                { type: "error", message: data.message },
                { status: 400 }
            );
        }

        // 🔁 CASE 1: Redirect required (YOUR CURRENT ISSUE)
        if (data.meta?.authorization?.redirect) {
            return NextResponse.json({
                type: "redirect",
                url: data.meta.authorization.redirect,
            });
        }

        // ✅ CASE 2: Immediate transaction ID
        if (data.data?.id) {
            return NextResponse.json({
                type: "success",
                transactionId: data.data.id,
                status: data.data.status,
            });
        }

        // fallback
        return NextResponse.json({
            type: "unknown",
            message: data.message,
        });
    } catch (error) {
        console.error("Payment error:", error);

        return NextResponse.json(
            { type: "error", message: "Payment failed" },
            { status: 500 }
        );
    }
}