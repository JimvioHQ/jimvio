/** Generic copy shown on storefront/checkout — never expose supplier internals. */
export const CJ_CUSTOMER_MESSAGES = {
    shippingRates:
        "We couldn't load shipping options for your address. Please try again or contact support.",
    shippingTimeout:
        "Shipping quotes are taking longer than usual. Please try again.",
    shippingQuota:
        "Shipping options are temporarily unavailable. Please try again shortly.",
    shippingUnavailable:
        "Shipping isn't available to this destination for the items in your order. Try a different address or contact support.",
    shippingSave:
        "We couldn't save your delivery choice. Please try again.",
    checkout:
        "Checkout couldn't be completed. Please try again or contact support.",
    paymentStart:
        "We couldn’t start this payment. Please try again or choose another payment method.",
    fulfillmentFailed:
        "Your order is confirmed. We're preparing it for shipment and will update you soon.",
    fulfillmentDelayed:
        "Your order is confirmed. Fulfillment is in progress — we'll notify you when it ships.",
    shippingSkipped:
        "Your order is confirmed. Shipping details will be finalized shortly.",
} as const;

const INTERNAL_PATTERNS: RegExp[] = [
    /\bCJ\b/,
    /cjdropshipping/i,
    /\bcj[_-]/i,
    /logisticName/i,
    /product_variants/i,
    /freightCalculate/i,
    /developers\.cjdropshipping/i,
    /cj[_-]/i,
    /dropship(ping|per|ment)?/i,
    /CJ-Access-Token/i,
    /CJ wallet/i,
    /wallet balance/i,
    /No valid CJ/i,
    /cj_vid/i,
    /HTTP \d{3}/,
    /lookup failed/i,
    /upsert failed/i,
    /Variant lookup failed/i,
    /CJ API error/i,
    /CJ shipping API/i,
    /CJ error code/i,
    /CJ order ID/i,
    /CJ dashboard/i,
    /CJ balance insufficient/i,
    /submission FAILED/i,
    /submission skipped/i,
    /admin portal/i,
    /retry FAILED/i,
    /forwarded to/i,
    /wallet balance/i,
    /insufficient.*api points/i,
    /api points/i,
];

export function containsCjInternalDetail(message: string): boolean {
    const text = message.trim();
    if (!text) return false;
    return INTERNAL_PATTERNS.some((pattern) => pattern.test(text));
}

export function isCjApiQuotaError(raw: unknown): boolean {
    const message =
        raw instanceof Error
            ? raw.message
            : typeof raw === "string"
              ? raw
              : "";
    return /insufficient api points|remaining:\s*0.*required|\bapi points\b/i.test(message);
}

/** Return a customer-safe message. Detailed CJ errors should be logged separately for admins. */
export function sanitizeCustomerError(raw: unknown, fallback: string): string {
    if (isCjApiQuotaError(raw)) return CJ_CUSTOMER_MESSAGES.shippingQuota;

    const message =
        raw instanceof Error
            ? raw.message
            : typeof raw === "string"
              ? raw
              : "";

    if (!message.trim()) return fallback;
    if (containsCjInternalDetail(message)) return fallback;

    return message;
}

/** Hide legacy CJ/internal notes already stored on order timeline rows. */
export function sanitizeOrderTimelineNote(note: string | null | undefined): string | null {
    if (!note?.trim()) return null;
    if (containsCjInternalDetail(note)) {
        return CJ_CUSTOMER_MESSAGES.fulfillmentDelayed;
    }
    return note;
}
