/**
 * NowPayments invoice — server-only.
 * Price stays in USD; do not convert (per integration rules).
 * Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt
 */

export async function createNowPaymentsInvoice(params: {
  orderId: string;
  amountUSD: number;
  customerEmail?: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  callbackUrl: string;
}): Promise<{ invoiceId: string; invoiceUrl: string; error?: string }> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY?.trim();
  if (!apiKey) {
    return { invoiceId: "", invoiceUrl: "", error: "NOWPAYMENTS_API_KEY is not set" };
  }

  try {
    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: params.amountUSD,
        price_currency: "usd",
        order_id: params.orderId,
        order_description: params.description,
        ipn_callback_url: params.callbackUrl,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
      }),
    });

    const data = (await res.json()) as {
      id?: string;
      invoice_url?: string;
      message?: string;
    };

    if (!res.ok || !data.invoice_url) {
      return {
        invoiceId: String(data.id ?? ""),
        invoiceUrl: "",
        error: data.message || `NowPayments invoice failed (${res.status})`,
      };
    }

    return {
      invoiceId: String(data.id ?? ""),
      invoiceUrl: data.invoice_url,
    };
  } catch (e) {
    return {
      invoiceId: "",
      invoiceUrl: "",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
