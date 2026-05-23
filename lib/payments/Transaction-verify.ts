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
    processor_response: string;
    customer: FlutterwaveCustomer;
    meta?: Record<string, unknown>;
}

export interface FlutterwaveVerifyResponse {
    status: "success" | "error";
    message: string;
    data: FlutterwaveTransaction | FlutterwaveTransaction[]; // single or array (verify_by_reference)
}

export interface VerifiedTransaction {
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
        processor_response: string;
        meta?: Record<string, unknown>;
    };
}

// ─── Custom Error ─────────────────────────────────────────────────────────────

export class FlutterwaveAPIError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = "FlutterwaveAPIError";
    }

    get isNotFound() {
        return (
            this.statusCode === 404 ||
            this.message.toLowerCase().includes("no transaction")
        );
    }
}

// ─── Config ───────────────────────────────────────────────────────────────────

function getFlwSecretKey(): string {
    const key = process.env.FLW_SECRET_KEY;
    if (!key) throw new Error("FLW_SECRET_KEY is not configured");
    return key.trim().replace(/^["']|["']$/g, "");
}

const FLW_BASE = "https://api.flutterwave.com/v3";
const FETCH_TIMEOUT_MS = 15_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * True if `id` looks like a numeric Flutterwave transaction ID.
 * tx_refs are alphanumeric strings (e.g. "TXN-abc123"), so they'll be false.
 */
function isNumericId(id: string): boolean {
    return /^\d+$/.test(id);
}

function buildVerifyUrl(id: string): string {
    // tx_refs are case-sensitive — never transform the case
    return isNumericId(id)
        ? `${FLW_BASE}/transactions/${id}/verify`
        : `${FLW_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(id)}`;
}

/**
 * When verifying by tx_ref, Flutterwave may return multiple transactions
 * (e.g. a failed attempt followed by a successful retry on the same ref).
 * Pick the most recent successful one, or fall back to most recent overall.
 */
function pickBestTransaction(
    txns: FlutterwaveTransaction[]
): FlutterwaveTransaction {
    const sorted = [...txns].sort(
        (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted.find((t) => t.status.toLowerCase() === "successful") ?? sorted[0];
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function flwGet<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    // Merge caller signal with the timeout signal
    signal?.addEventListener("abort", () => controller.abort(), { once: true });

    try {
        const res = await fetch(`${FLW_BASE}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${getFlwSecretKey()}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
            signal: controller.signal,
        });

        // Read the body ONCE
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;

        if (!res.ok) {
            throw new FlutterwaveAPIError(
                (data.message as string) || `HTTP ${res.status}: ${res.statusText}`,
                res.status,
                data
            );
        }

        return data as T;
    } catch (err) {
        if (err instanceof FlutterwaveAPIError) throw err;
        if (err instanceof Error && err.name === "AbortError") {
            throw new FlutterwaveAPIError(
                signal?.aborted ? "Verification aborted by caller" : "Flutterwave request timed out",
                408
            );
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function verifyFlutterwaveTransaction(
    id: string,
    options: { signal?: AbortSignal } = {}
): Promise<VerifiedTransaction> {
    if (!id?.trim()) {
        throw new FlutterwaveAPIError("Transaction ID or reference is required", 400);
    }

    const endpoint = isNumericId(id)
        ? `/transactions/${id}/verify`
        : `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(id)}`;

    const result = await flwGet<FlutterwaveVerifyResponse>(endpoint, options.signal);

    if (result.status !== "success" || !result.data) {
        throw new FlutterwaveAPIError(result.message || "Verification failed", 422, result);
    }

    // verify_by_reference returns an array; /verify returns a single object
    const tx = Array.isArray(result.data)
        ? pickBestTransaction(result.data)
        : result.data;

    if (!tx) {
        throw new FlutterwaveAPIError("No transaction data in response", 422, result);
    }

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
            processor_response: tx.processor_response,
            ...(tx.meta && { meta: tx.meta }),
        },
    };
}