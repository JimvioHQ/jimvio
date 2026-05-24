import crypto from "crypto";

const BINANCE_PAY_BASE = "https://bpay.binanceapi.com";
const API_KEY = process.env.BINANCE_PAY_API_KEY!;
const API_SECRET = process.env.BINANCE_PAY_API_SECRET!;
const REQUEST_TIMEOUT_MS = 10_000;

// ─── Signature helpers (for OUTBOUND requests — HMAC-SHA512) ──────────────────

function buildSignature(timestamp: string, nonce: string, body: string): string {
    const payload = `${timestamp}\n${nonce}\n${body}\n`;
    return crypto
        .createHmac("sha512", API_SECRET)
        .update(payload)
        .digest("hex")
        .toUpperCase();
}

function buildHeaders(body: string) {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString("hex").toUpperCase();
    const signature = buildSignature(timestamp, nonce, body);

    return {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": API_KEY,
        "BinancePay-Signature": signature,
    };
}

function extractFetchError(err: unknown): string {
    if (!(err instanceof Error)) return String(err);
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
        const code = (cause as Error & { code?: string }).code;
        return code ? `${cause.message} (${code})` : cause.message;
    }
    return err.message;
}

async function binanceRequest<T>(
    path: string,
    body: Record<string, unknown>
): Promise<T> {
    if (!API_KEY || !API_SECRET) {
        throw new Error(
            "Binance Pay is not configured (missing BINANCE_PAY_API_KEY or BINANCE_PAY_API_SECRET)"
        );
    }

    const bodyStr = JSON.stringify(body);
    const headers = buildHeaders(bodyStr);
    const url = `${BINANCE_PAY_BASE}${path}`;

    let res: Response;
    try {
        res = await fetch(url, {
            method: "POST",
            headers,
            body: bodyStr,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (err) {
        const reason = extractFetchError(err);
        throw new Error(
            `Could not reach Binance Pay (${url}): ${reason}. ` +
            `If this is a connection timeout, your server may be blocked by Binance's geo-restrictions ` +
            `or behind a firewall that blocks outbound HTTPS.`
        );
    }

    const rawBody = await res.text();

    if (!res.ok) {
        console.error("[binance-pay] HTTP error response", {
            url,
            status: res.status,
            statusText: res.statusText,
            headers: Object.fromEntries(res.headers.entries()),
            body: rawBody,
            requestBody: bodyStr,
        });
    }

    let json: { status?: string; code?: string; errorMessage?: string; data?: T };
    try {
        json = JSON.parse(rawBody);
    } catch {
        throw new Error(
            `Binance Pay returned non-JSON response (HTTP ${res.status}): ${rawBody.slice(0, 200)}`
        );
    }

    if (!res.ok || json.status !== "SUCCESS") {
        throw new Error(
            `Binance Pay error (HTTP ${res.status}): ${json.code ?? "no-code"} – ${json.errorMessage ?? json.status ?? rawBody.slice(0, 200)}`
        );
    }

    return json.data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrderParams {
    merchantOrderId: string;
    orderAmount: number;
    currency: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
}

export interface BinancePayOrder {
    prepayId: string;
    terminalType: string;
    expireTime: number;
    qrcodeLink: string;
    qrContent: string;
    checkoutUrl: string;
    deeplink: string;
    universalUrl: string;
}

export interface TransferParams {
    merchantSendId: string;
    binanceUserId: string;
    transferAmount: number;
    currency: string;
    remark?: string;
}

export interface BinanceTransferResult {
    tranId: string;
    orderStatus: "INIT" | "PROCESS" | "SUCCESS" | "FAIL";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createBinancePayOrder(
    params: CreateOrderParams
): Promise<BinancePayOrder> {
    const merchantTradeNo = params.merchantOrderId
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 32);

    if (!merchantTradeNo) {
        throw new Error(
            `merchantTradeNo became empty after sanitization. Original: "${params.merchantOrderId}"`
        );
    }

    const goodsName = params.description.slice(0, 256);
    const referenceGoodsId = merchantTradeNo;

    return binanceRequest<BinancePayOrder>("/binancepay/openapi/v3/order", {
        env: {
            terminalType: "WEB",
        },
        merchantTradeNo,
        orderAmount: Number(params.orderAmount.toFixed(2)),
        currency: params.currency.toUpperCase(),
        description: goodsName,
        returnUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
        goodsDetails: [
            {
                goodsType: "01",
                goodsCategory: "Z000",
                referenceGoodsId,
                goodsName,
            },
        ],
    });
}

export async function queryBinanceOrder(prepayId: string) {
    return binanceRequest<{ status: string; transactionId: string }>(
        "/binancepay/openapi/v3/order/query",
        { prepayId }
    );
}

export async function transferToBinanceUser(
    params: TransferParams
): Promise<BinanceTransferResult> {
    return binanceRequest<BinanceTransferResult>(
        "/binancepay/openapi/wallet/transfer",
        {
            requestId: params.merchantSendId,
            bizType: "PAY",
            bizId: params.merchantSendId,
            currency: params.currency,
            amount: params.transferAmount.toFixed(8),
            transferType: "TO_MAIN",
            remark: params.remark ?? "Platform payout",
        }
    );
}

// ─── Webhook verification (RSA-SHA256, base64 signature) ──────────────────────

interface CachedCert {
    pem: string;
    expiresAt: number;
}

const certCache = new Map<string, CachedCert>();
const CERT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Fetch Binance Pay's public certificate for verifying webhook signatures.
 * Binance rotates these — always fetch by the certificate serial number sent
 * in the webhook header, and cache locally.
 */
async function getBinancePublicCert(certSerial: string): Promise<string> {
    const cached = certCache.get(certSerial);
    if (cached && cached.expiresAt > Date.now()) return cached.pem;

    const data = await binanceRequest<Array<{ certSerial: string; certPublic: string }>>(
        "/binancepay/openapi/certificates",
        {}
    );

    const match = data.find(c => c.certSerial === certSerial);
    if (!match) {
        throw new Error(
            `Binance certificate ${certSerial} not found in /certificates response. ` +
            `Available serials: ${data.map(c => c.certSerial).join(", ")}`
        );
    }

    certCache.set(certSerial, {
        pem: match.certPublic,
        expiresAt: Date.now() + CERT_TTL_MS,
    });

    return match.certPublic;
}


export async function verifyBinanceWebhook(
    timestamp: string,
    nonce: string,
    body: string,
    receivedSignature: string,
    certificateSerial: string
): Promise<boolean> {
    if (!timestamp || !nonce || !body || !receivedSignature || !certificateSerial) {
        console.warn("[verifyBinanceWebhook] missing required input", {
            hasTimestamp: !!timestamp,
            hasNonce: !!nonce,
            hasBody: !!body,
            hasSignature: !!receivedSignature,
            hasCertSerial: !!certificateSerial,
        });
        return false;
    }

    try {
        const publicKeyPem = await getBinancePublicCert(certificateSerial);
        const payload = `${timestamp}\n${nonce}\n${body}\n`;

        const verifier = crypto.createVerify("RSA-SHA256");
        verifier.update(payload, "utf8");
        verifier.end();

        const valid = verifier.verify(publicKeyPem, receivedSignature, "base64");

        if (!valid) {
            console.warn("[verifyBinanceWebhook] signature did not verify", {
                certSerial: certificateSerial,
                signatureLength: receivedSignature.length,
                payloadPreview: payload.slice(0, 80),
            });
        }

        return valid;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[verifyBinanceWebhook] verification threw", msg);
        return false;
    }
}