import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrRefreshAccessToken } from "@/lib/cj/auth";

export type CjOrderLine = {
  orderItemId: string;
  productId: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sourceMetadata: Record<string, unknown> | null;
};

const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

async function cjPost<T>(
  path: string,
  accessToken: string,
  body: unknown,
  retries = 3,
  delayMs = 1300
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`${CJ_API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CJ-Access-Token": accessToken,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (res.status === 429 || json?.message?.includes("Too Many Requests")) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw new Error(`CJ API error on ${path}: Too Many Requests, QPS limit is 1 time/1second`);
    }

    if (!res.ok) {
      throw new Error(`CJ API error on ${path}: ${json?.message ?? res.statusText}`);
    }

    return json as T;
  }
  throw new Error(`CJ request to ${path} failed after ${retries} retries`);
}

async function resolveCjLogisticName(
  accessToken: string,
  products: { vid: unknown; quantity: number }[],
  countryCode: string,
  fallback: string
): Promise<string> {
  try {
    const body = await cjPost<any>(
      "/logistics/freights/products/list",
      accessToken,
      {
        products: products.map((p) => ({ vid: p.vid, quantity: p.quantity })),
        countryCode,
      }
    );

    const options: any[] = body?.data ?? [];
    if (!options.length) {
      console.warn(`[CJ] No logistics options returned for ${countryCode}, falling back to "${fallback}"`);
      return fallback;
    }

    const sorted = [...options].sort((a, b) => (a.logisticPrice ?? 0) - (b.logisticPrice ?? 0));
    return sorted[0].logisticName as string;
  } catch (err) {
    console.warn(`[CJ] Logistics lookup failed, falling back to "${fallback}":`, err);
    return fallback;
  }
}

export async function submitCjOrderForLines(
  _db: SupabaseClient,
  orderId: string,
  orderNumber: string,
  lines: CjOrderLine[]
): Promise<{ ok: boolean; externalReference?: string | null; error?: string }> {
  if (lines.length === 0) {
    return { ok: true, externalReference: null };
  }

  let accessToken: string;
  try {
    accessToken = await getOrRefreshAccessToken();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to acquire CJ access token";
    console.error(`[CJ] Access token acquisition failed for order ${orderNumber} (${orderId}):`, message);
    return { ok: false, error: message };
  }

  const { data: orderData, error: orderErr } = await _db
    .from("orders")
    .select("shipping_address, buyer_id, cj_shipping_method")
    .eq("id", orderId)
    .single();

  if (orderErr || !orderData) {
    console.error(`[CJ] Could not fetch order ${orderId} for shipping details`, orderErr);
    return { ok: false, error: "Failed to load order shipping data" };
  }

  const shipping = orderData.shipping_address as any;
  if (!shipping) {
    console.warn(`[CJ] Order ${orderId} has no shipping_address.`);
    return { ok: false, error: "No shipping address provided" };
  }

  const countryCode: string =
    shipping.country_code || shipping.countryCode || shipping.country || "US";

  const productLines = lines.map((line) => ({
    vid: line.sourceMetadata?.vid ?? line.sourceMetadata?.variant_id ?? "",
    quantity: line.quantity,
  }));

  const savedMethod = ((orderData as any)?.cj_shipping_method as string | undefined)?.trim();
  const logisticName = savedMethod
    ? savedMethod
    : await resolveCjLogisticName(accessToken, productLines, countryCode, "CJPacket Ordinary");

  const cjPayload = {
    orderNumber,
    fromCountryCode: "CN",
    shippingZip: (shipping.zip as string | undefined)?.trim() || "00000",
    shippingCountryCode: countryCode,
    shippingCountry: shipping.country || countryCode,
    shippingProvince: shipping.province || shipping.state || shipping.city || "Unknown",
    shippingCity: shipping.city || "Unknown",
    shippingAddress: shipping.address1 || "Unknown",
    shippingAddress2: shipping.address2 || "",
    shippingFirstName: shipping.firstName || shipping.first_name || "Customer",
    shippingLastName: shipping.lastName || shipping.last_name || "",
    shippingPhone: shipping.phone || "0000000000",
    shippingEmail: shipping.email || "",
    logisticName,
    remark: `jimvio-${orderId}`,
    products: productLines.map((p) => ({ vid: p.vid, quantity: p.quantity })),
  };

  try {
    const body = await cjPost<any>(
      "/shopping/order/createOrder",
      accessToken,
      cjPayload
    );

    if (body.code !== 200 && body.result !== true) {
      console.error(`[CJ] Order creation failed for ${orderId}:`, body);
      return { ok: false, error: body.message || "CJ API error" };
    }

    const cjOrderId = body.data?.orderId ?? body.data?.cjOrderId ?? null;
    console.log(`[CJ] Order ${orderId} submitted successfully. CJ order ID: ${cjOrderId}`);
    return { ok: true, externalReference: cjOrderId };
  } catch (err: any) {
    console.error(`[CJ] Submission failed for order ${orderId}:`, err.message);
    return { ok: false, error: err.message };
  }
}