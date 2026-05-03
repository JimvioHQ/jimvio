import { NextResponse } from "next/server";

const FLW_MOMO_URL =
    "https://api.flutterwave.com/v3/charges?type=mobile_money_rwanda";

const SUPPORTED_NETWORKS = ["MTN", "AIRTEL"] as const;
type MoMoNetwork = (typeof SUPPORTED_NETWORKS)[number];

function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Rwanda phone: starts with 07 (10 digits) or +2507 (12 digits)
function validateRwandaPhone(phone: string): boolean {
    return /^(?:\+2507\d{8}|07\d{8})$/.test(phone);
}

function normalizePhone(phone: string): string {
    // Flutterwave expects international format without "+": 2507XXXXXXXX
    return phone.startsWith("+")
        ? phone.slice(1)
        : phone.replace(/^0/, "250");
}

export async function POST(req: Request) {
    // 1. Parse body safely
    let body: {
        phone?: unknown;
        amount?: unknown;
        email?: unknown;
        name?: unknown;
        network?: unknown;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // 2. Validate inputs
    const rawPhone = String(body.phone ?? "").trim();
    const amount = Number(body.amount);
    const email = String(body.email ?? "").trim();
    const fullname = String(body.name ?? "Customer").trim();
    const network = String(body.network ?? "MTN").toUpperCase() as MoMoNetwork;

    if (!rawPhone || !validateRwandaPhone(rawPhone)) {
        return NextResponse.json(
            { error: "Invalid or missing phone number (e.g. 07XXXXXXXX)" },
            { status: 400 }
        );
    }

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

    if (!SUPPORTED_NETWORKS.includes(network)) {
        return NextResponse.json(
            {
                error: `Unsupported network. Must be one of: ${SUPPORTED_NETWORKS.join(", ")}`,
            },
            { status: 400 }
        );
    }

    // 3. Ensure env vars are present
    const secretKey = process.env.FLW_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!secretKey) {
        console.error("[MoMo] FLW_SECRET_KEY is not configured");
        return NextResponse.json(
            { error: "Payment service is not configured" },
            { status: 500 }
        );
    }

    if (!appUrl) {
        console.error("[MoMo] NEXT_PUBLIC_APP_URL is not configured");
        return NextResponse.json(
            { error: "App URL is not configured" },
            { status: 500 }
        );
    }

    // 4. Call Flutterwave
    const txRef = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    let data: {
        status: string;
        message?: string;
        data?: { id?: string; status?: string };
        meta?: { authorization?: { redirect?: string } };
    };

    try {
        const res = await fetch(FLW_MOMO_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                phone_number: normalizePhone(rawPhone),
                amount,
                currency: "RWF",
                redirect_url: `${appUrl}/payment-success`,
                email,
                fullname: fullname || "Customer",
                tx_ref: txRef,
                network,
            }),
        });

        data = await res.json();
    } catch (err) {
        console.error("[MoMo] Flutterwave network error:", err);
        return NextResponse.json(
            { error: "Failed to reach payment provider" },
            { status: 502 }
        );
    }

    console.log("[MoMo] Flutterwave response:", {
        status: data.status,
        message: data.message,
        txRef,
    });

    if (data.status !== "success") {
        return NextResponse.json(
            { type: "error", message: data.message ?? "Payment initiation failed" },
            { status: 400 }
        );
    }

    if (data.meta?.authorization?.redirect) {
        return NextResponse.json({
            type: "redirect",
            url: data.meta.authorization.redirect,
        });
    }

    if (data.data?.id) {
        return NextResponse.json({
            type: "success",
            transactionId: data.data.id,
            status: data.data.status,
        });
    }

    console.warn("[MoMo] Unexpected Flutterwave response shape:", {
        status: data.status,
        message: data.message,
    });
    return NextResponse.json(
        {
            type: "error",
            message:
                data.message ?? "Unexpected response from payment provider",
        },
        { status: 502 }
    );
}