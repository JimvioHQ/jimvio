export {
    CJ_CUSTOMER_MESSAGES,
    containsCjInternalDetail,
    sanitizeCustomerError,
    sanitizeOrderTimelineNote,
} from "@/lib/cj/customer-errors-shared";

/** Write full CJ error details to server logs and admin cj_logs when possible. */
export async function logCjInternalError(options: {
    action: string;
    message: string;
    error: unknown;
    orderId?: string;
    request?: unknown;
    response?: unknown;
}): Promise<void> {
    const errorText =
        options.error instanceof Error
            ? options.error.message
            : String(options.error ?? "");

    console.error(`[CJ] ${options.action}: ${options.message}`, errorText || options.error);

    if (!options.orderId) return;

    try {
        const { logCJ } = await import("@/lib/cj/cj-order-queue");
        await logCJ({
            order_id: options.orderId,
            action: options.action,
            message: options.message,
            error: errorText || undefined,
            request: options.request,
            response: options.response,
        });
    } catch {
        // Never block customer flows for logging failures
    }
}
