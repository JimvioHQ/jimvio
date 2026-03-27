import type { SupabaseClient } from "@supabase/supabase-js";

export type CjOrderLine = {
  orderItemId: string;
  productId: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sourceMetadata: Record<string, unknown> | null;
};

/**
 * Push a paid order line to CJ Dropshipping for auto-fulfillment.
 * Wire CJ REST credentials + mapping when integrating (env vars, API base URL).
 */
export async function submitCjOrderForLines(
  _db: SupabaseClient,
  orderId: string,
  orderNumber: string,
  lines: CjOrderLine[]
): Promise<{ ok: boolean; externalReference?: string | null; error?: string }> {
  if (lines.length === 0) {
    return { ok: true, externalReference: null };
  }

  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) {
    console.warn(
      `[CJ] CJ_API_KEY not set — order ${orderNumber} (${orderId}) has ${lines.length} CJ line(s); queue for manual ops or set credentials.`
    );
    return { ok: true, externalReference: null };
  }

  // TODO: POST to CJ order API with shipping payload from orders + order_items
  void orderId;
  void orderNumber;
  void lines;
  return { ok: true, externalReference: null };
}
