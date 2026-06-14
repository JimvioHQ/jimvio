/** Generic copy shown on storefront/checkout — never expose supplier internals. */
export const CJ_CUSTOMER_MESSAGES = {
    shippingRates:
        "We couldn't load shipping options for your address. Please try again or contact support.",
    shippingSave:
        "We couldn't save your delivery choice. Please try again.",
    checkout:
        "Checkout couldn't be completed. Please try again or contact support.",
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
    /QPS limit/i,
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
];

export function containsCjInternalDetail(message: string): boolean {
    const text = message.trim();
    if (!text) return false;
    return INTERNAL_PATTERNS.some((pattern) => pattern.test(text));
}

/** Return a customer-safe message. Detailed CJ errors should be logged separately for admins. */
export function sanitizeCustomerError(raw: unknown, fallback: string): string {
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
