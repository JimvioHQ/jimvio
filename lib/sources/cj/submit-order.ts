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

  const { data: orderData, error: orderErr } = await _db
    .from("orders")
    .select("shipping_address, buyer_id")
    .eq("id", orderId)
    .single();
    
  if (orderErr || !orderData) {
    console.error(`[CJ] Could not fetch order ${orderId} for shipping details`, orderErr);
    return { ok: false, error: "Failed to load order shipping data" };
  }

  const shipping = orderData.shipping_address as any;
  if (!shipping) {
    console.warn(`[CJ] Order ${orderId} has no shipping_address. CJ requires an address.`);
    return { ok: false, error: "No shipping address provided" };
  }

  // Map to CJ format
  const cjPayload = {
    orderNumber: orderNumber,
    shippingZip: shipping.zip || "00000",
    shippingCountry: shipping.countryCode || "US",
    shippingCity: shipping.city || "Unknown",
    shippingAddress: shipping.address1 || "Unknown",
    shippingCustomerName: shipping.name || "Customer",
    shippingPhone: shipping.phone || "0000000000",
    remark: `jimvio-${orderId}`,
    products: lines.map((line) => {
      // the variant ID from CJ is typically stored in sourceMetadata by the importer
      const cjVariantId = line.sourceMetadata?.vid || line.sourceMetadata?.variant_id || "";
      return {
        vid: cjVariantId,
        quantity: line.quantity,
      };
    }),
  };

  try {
    const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CJ-Access-Token": apiKey,
      },
      body: JSON.stringify(cjPayload),
    });

    const body = await res.json();
    if (!res.ok || body.code !== 200) {
      console.error(`[CJ] Order creation failed for ${orderId}:`, body);
      return { ok: false, error: body.message || "CJ API error" };
    }

    // Success
    const cjOrderId = body.data?.orderId;
    return { ok: true, externalReference: cjOrderId };
  } catch (err: any) {
    console.error(`[CJ] Exception during order submission:`, err);
    return { ok: false, error: err.message };
  }
}
