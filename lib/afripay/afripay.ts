import crypto from "crypto";

function requireAfriPayCredentials() {
  const appId = process.env.AFRIPAY_APP_ID?.trim();
  const appSecret = process.env.AFRIPAY_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new Error("AFRIPAY_APP_ID or AFRIPAY_APP_SECRET is not set");
  }
  return { appId, appSecret };
}

type CreatePaymentConfig = {
  amount: number;
  currency: string;
  orderId: string; // client_token
  returnUrl: string;
  cancelUrl: string;
};

export async function createAfriPaySession(config: CreatePaymentConfig) {
    if (!config.amount || config.amount <= 0) throw new Error("Invalid amount");
    if (!config.orderId) throw new Error("Missing Order ID (client_token)");
    const { appId } = requireAfriPayCredentials();

    const isSandbox = process.env.AFRIPAY_SANDBOX === "true";
    const gatewayUrl = isSandbox 
        ? "https://sandbox.afripay.africa/checkout/index.php"
        : "https://afripay.africa/checkout/index.php";

    const payload = {
        app_id: appId,
        amount: Math.round(config.amount).toString(),
        currency: config.currency || "RWF",
        client_token: config.orderId,
        return_url: config.returnUrl,
        cancel_url: config.cancelUrl,
        success_url: config.returnUrl,
        callback_url: config.returnUrl,
        appId: appId,
        clientToken: config.orderId
    };

    return {
        success: true,
        gateway_url: gatewayUrl, 
        form_data: payload
    };
}

/**
 * Validates the incoming webhook/callback from AfriPay.
 */
export function validateAfriPayCallback(body: unknown, signature: string) {
    const { appSecret } = requireAfriPayCredentials();
    if (!signature) return false;
    try {
        const payloadString = JSON.stringify(body);
        const expectedSignature = crypto
            .createHmac('sha256', appSecret)
            .update(payloadString)
            .digest('hex');
        const a = Buffer.from(expectedSignature);
        const b = Buffer.from(signature);
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}
