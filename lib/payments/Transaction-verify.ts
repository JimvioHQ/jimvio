// lib/flutterwave.ts

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlutterwaveCustomer {
    id: number;
    name: string;
    email: string;
    phone_number: string;
}

export interface FlutterwaveTransaction {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    charged_amount: number;
    currency: string;
    status: string;
    payment_type: string;
    auth_model: string;
    created_at: string;
    customer: FlutterwaveCustomer;
    meta?: Record<string, unknown>;
}

export interface FlutterwaveVerifyResponse {
    status: "success" | "error";
    message: string;
    data: FlutterwaveTransaction;
}

export interface VerifySuccessPayload {
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
        customer: FlutterwaveCustomer;
        created_at: string;
        meta?: Record<string, unknown>;
    };
}

// ─── Custom Error ─────────────────────────────────────────────────────────────

export class FlutterwaveAPIError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number
    ) {
        super(message);
        this.name = "FlutterwaveAPIError";
    }
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

// ─── Core shared function (call this directly on the server) ──────────────────

/**
 * Verifies a Flutterwave transaction by numeric ID or tx_ref string.
 *
 * Use this directly in Server Components, Server Actions, or other
 * API routes instead of fetching your own /api/flutterwave/verify endpoint.
 *
 * @example
 * // Server Component
 * const payload = await verifyFlutterwaveTransaction("TXN_ABC123");
 *
 * @example
 * // Another API route
 * const payload = await verifyFlutterwaveTransaction(transactionId);
 */
export async function verifyFlutterwaveTransaction(
    id: string
): Promise<VerifySuccessPayload> {
    if (!id?.trim()) {
        throw new FlutterwaveAPIError("Transaction ID or reference is required", 400);
    }

    const url = buildVerifyUrl(id);
    const result = await fetchFlutterwaveVerification(url);

    if (result.status !== "success" || !result.data) {
        throw new FlutterwaveAPIError(result.message || "Verification failed", 422);
    }

    const tx = result.data;

    return {
        status: tx.status.toLowerCase(),
        data: {
            id: tx.id,
            tx_ref: tx.tx_ref,
            flw_ref: tx.flw_ref,
            amount: tx.amount,
            charged_amount: tx.charged_amount,
            currency: tx.currency,
            status: tx.status,
            payment_type: tx.auth_model || tx.payment_type,
            customer: tx.customer,
            created_at: tx.created_at,
            ...(tx.meta && { meta: tx.meta }),
        },
    };
}