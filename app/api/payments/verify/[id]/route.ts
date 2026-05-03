// app/api/flutterwave/verify/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlutterwaveTransaction {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    charged_amount: number;
    currency: string;
    status: string;
    payment_type: string;
    created_at: string;
    customer: {
        id: number;
        name: string;
        email: string;
        phone_number: string;
    };
    meta?: Record<string, unknown>;
}

interface FlutterwaveVerifyResponse {
    status: "success" | "error";
    message: string;
    data: FlutterwaveTransaction;
}

interface VerifySuccessPayload {
    status: string;
    data: {
        id: number;
        tx_ref: string;
        flw_ref: string;
        amount: number;
        charged_amount: number;
        currency: string;
        status: string;
        payment_type: string;
        customer: FlutterwaveTransaction["customer"];
        created_at: string;
        meta?: Record<string, unknown>;
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildVerifyUrl(id: string): string {
    const isNumericId = /^\d+$/.test(id);
    return isNumericId
        ? `https://api.flutterwave.com/v3/transactions/${id}/verify`
        : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${id.toUpperCase()}`;
}

function getFlwSecretKey(): string {
    const key = process.env.FLW_SECRET_KEY;
    if (!key) throw new Error("FLW_SECRET_KEY is not configured");
    return key;
}

async function fetchFlutterwaveVerification(
    url: string
): Promise<FlutterwaveVerifyResponse> {
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${getFlwSecretKey()}`,
            "Content-Type": "application/json",
        },
        // Prevent stale caches on repeated polling
        cache: "no-store",
    });

    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new FlutterwaveAPIError(
            errorBody?.message || `HTTP ${res.status}: ${res.statusText}`,
            res.status
        );
    }

    return res.json();
}

// ─── Custom Error ─────────────────────────────────────────────────────────────

class FlutterwaveAPIError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number
    ) {
        super(message);
        this.name = "FlutterwaveAPIError";
    }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!id?.trim()) {
        return NextResponse.json(
            { status: "error", message: "Transaction ID or reference is required" },
            { status: 400 }
        );
    }

    const url = buildVerifyUrl(id);

    try {
        const result = await fetchFlutterwaveVerification(url);

        if (result.status !== "success" || !result.data) {
            return NextResponse.json(
                { status: "error", message: result.message || "Verification failed" },
                { status: 422 }
            );
        }

        const tx = result.data;
        
        const payload: VerifySuccessPayload = {
            status: tx.status.toLowerCase(),
            data: {
                id: tx.id,
                tx_ref: tx.tx_ref,
                flw_ref: tx.flw_ref,
                amount: tx.amount,
                charged_amount: tx.charged_amount,
                currency: tx.currency,
                status: tx.status,
                payment_type: tx.payment_type,
                customer: tx.customer,
                created_at: tx.created_at,
                ...(tx.meta && { meta: tx.meta }),
            },
        };

        return NextResponse.json(payload, { status: 200 });
    } catch (error) {
        if (error instanceof FlutterwaveAPIError) {
            // Map Flutterwave's own HTTP errors back to the caller
            const clientStatus = error.statusCode === 404 ? 404 : 502;
            return NextResponse.json(
                { status: "error", message: error.message },
                { status: clientStatus }
            );
        }

        if (error instanceof Error && error.message.includes("FLW_SECRET_KEY")) {
            return NextResponse.json(
                { status: "error", message: "Payment service is misconfigured" },
                { status: 503 }
            );
        }

        console.error("[flutterwave/verify] Unexpected error:", error);

        return NextResponse.json(
            { status: "error", message: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}