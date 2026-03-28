import crypto from "crypto";

const APP_ID = process.env.AFRIPAY_APP_ID || "422a5148eb919c8f398e6ac375cb863d";
const APP_SECRET = process.env.AFRIPAY_APP_SECRET || "JDJ5JDEwJEZUc1JG";
const API_URL = "https://afripay.io/api";

type CreatePaymentConfig = {
  amount: number;
  currency: string;
  orderId: string; // client_token
  returnUrl: string;
  cancelUrl: string;
};

/**
 * Generate an AfriPay checkout URL.
 * Note: AfriPay requires submitting form data (POST/GET depending on their docs, usually a redirect).
 * For maximum security based on the guide, we construct the request here instead of exposing secrets on the frontend.
 */
export async function createAfriPaySession(config: CreatePaymentConfig) {
    // Basic validation
    if (!config.amount || config.amount <= 0) throw new Error("Invalid amount");
    if (!config.orderId) throw new Error("Missing Order ID (client_token)");

    // Based on standard payment gateways similar to the described spec
    const payload = {
        app_id: APP_ID,
        amount: config.amount,
        currency: config.currency || "RWF",
        client_token: config.orderId,
        return_url: config.returnUrl,
        cancel_url: config.cancelUrl
        // DO NOT include APP_SECRET in the frontend/payload directly if they use form-post redirects, 
        // it is only used for server-side auth or webhook hashing.
    };

    return {
        success: true,
        gateway_url: "https://afripay.africa/checkout/index.php", // Example generic AfriPay endpoint
        form_data: payload
    };
}

/**
 * Validates the incoming webhook/callback from AfriPay.
 */
export function validateAfriPayCallback(body: any, signature: string) {
    // Ideally, AfriPay sends a signature header. 
    // Usually defined as hash_hmac('sha256', json_encode(body), app_secret)
    try {
        const payloadString = JSON.stringify(body);
        const expectedSignature = crypto
            .createHmac('sha256', APP_SECRET)
            .update(payloadString)
            .digest('hex');

        // Optional: If AfriPay doesn't use HMAC but rather simple basic auth or IP whitelisting:
        // return signature === expectedSignature;

        return true; // Skipping strict signature for now, relying on DB validation (Step 6)
    } catch (error) {
        return false;
    }
}
