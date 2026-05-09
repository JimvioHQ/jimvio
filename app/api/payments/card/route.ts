import { NextResponse } from "next/server";
import { generateTxRef } from "@/lib/payments/tx-ref";

const FLW_API_URL = "https://api.flutterwave.com/v3/payments";

function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
    // 1. Parse body safely
    let body: { amount?: unknown; email?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 }
        );
    }

    // 2. Validate inputs
    const amount = Number(body.amount);
    const email = String(body.email ?? "").trim();

    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
        return NextResponse.json(
            { error: "Invalid or missing amount" },
            { status: 400 }
        );
    }

    if (!email || !validateEmail(email)) {
        return NextResponse.json(
            { error: "Invalid or missing email" },
            { status: 400 }
        );
    }

    // 3. Ensure env vars are set
    const secretKey = process.env.FLW_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!secretKey) {
        console.error("FLW_SECRET_KEY is not configured");
        return NextResponse.json(
            { error: "Payment service is not configured" },
            { status: 500 }
        );
    }

    if (!appUrl) {
        console.error("NEXT_PUBLIC_APP_URL is not configured");
        return NextResponse.json(
            { error: "App URL is not configured" },
            { status: 500 }
        );
    }

    let data: { status: string; message?: string; data?: { link?: string } };
    try {
        const res = await fetch(FLW_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tx_ref: generateTxRef("CARD"),
                payment_options: "card,banktransfer,mobilemoney",
                amount,
                currency: "RWF",
                redirect_url: `${appUrl}/payment-success`,
                customer: { email },
            }),
        });

        data = await res.json();
    } catch (err) {
        console.error("Flutterwave network error:", err);
        return NextResponse.json(
            { error: "Failed to reach payment provider" },
            { status: 502 }
        );
    }

    if (data.status !== "success" || !data.data?.link) {
        console.error("Flutterwave error response:", data);
        return NextResponse.json(
            { error: data.message ?? "Payment initiation failed" },
            { status: 502 }
        );
    }

    return NextResponse.json({ link: data.data.link });
}