// services/cj/cj-order-service.ts
//
// Handles the full lifecycle of submitting orders to CJ Dropshipping:
//   1. Token management  (refresh when expired)
//   2. Shipping options  (freightCalculate)
//   3. Order submission  (createOrder)
//   4. Order status poll (getOrderDetail)
//   5. Fulfillment sync  (write-back to Supabase)
//
// All Supabase writes use the service role client — this runs
// server-side only (edge functions / API routes / server actions).

import { createServiceRoleClient } from "@/lib/supabase/service-role";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export interface CJCredentials {
  access_token: string;
  refresh_token?: string;
  email: string;
  token_expires_at: string | null; // ISO string
}

export interface CJShippingOption {
  logisticName: string;       // e.g. "CJPacket Ordinary"
  logisticAbbreviation: string;
  logisticPrice: number;      // USD
  logisticTime: string;       // e.g. "7-15"
  trackable: boolean;
}

export interface CJOrderLine {
  vid: string;                // product_variants.cj_vid
  quantity: number;
  shippingName: string;       // logisticName from shipping options
}

export interface CJShippingAddress {
  name: string;
  phone: string;
  countryCode: string;        // ISO-3166 alpha-2, e.g. "RW"
  province: string;
  city: string;
  address: string;
  address2?: string;
  zip: string;
}

export interface CJOrderResult {
  cjOrderId: string;
  cjOrderNum: string;
}

export interface CJOrderDetail {
  cjOrderId: string;
  cjOrderNum: string;
  orderStatus: string;        // "CREATED" | "PAYING" | "IN_PROCESS" | "SHIPPED" | ...
  trackingNumber?: string;
  logisticName?: string;
  shippingTime?: string;
  products: Array<{
    vid: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// Internal shape stored in platform_settings under key "cj_credentials"
interface StoredCredentials {
  access_token: string;
  refresh_token?: string;
  email: string;
  token_expires_at: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────────────────────

export class CJApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "CJApiError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREDENTIAL MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read CJ credentials from platform_settings.
 * Throws if not configured.
 */
async function getCredentials(): Promise<StoredCredentials> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "cj_credentials")
    .single();

  if (error || !data) {
    throw new CJApiError("CJ credentials not found in platform_settings");
  }

  const creds = data.value as StoredCredentials;
  if (!creds.access_token || !creds.email) {
    throw new CJApiError(
      "CJ credentials are incomplete. Set access_token and email in platform_settings."
    );
  }

  return creds;
}

/**
 * Persist refreshed credentials back to platform_settings.
 */
async function saveCredentials(creds: StoredCredentials): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("platform_settings")
    .update({ value: creds, updated_at: new Date().toISOString() })
    .eq("key", "cj_credentials");
}

/**
 * Returns true when the stored token will expire within the next 10 minutes.
 */
function isTokenExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return true; // treat unknown expiry as expired
  const expiryMs = new Date(expiresAt).getTime();
  const bufferMs = 10 * 60 * 1000; // 10 minutes
  return Date.now() + bufferMs >= expiryMs;
}

/**
 * Refresh the CJ access token using email + password stored in settings,
 * or using the refresh_token if available.
 *
 * CJ's API: POST /authentication/getAccessToken
 */
async function refreshAccessToken(current: StoredCredentials): Promise<StoredCredentials> {

  const supabase = createServiceRoleClient();
  const { data: secretRow } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "cj_credentials_secret")
    .maybeSingle();

  const password = (secretRow?.value as any)?.password as string | undefined;
  if (!password) {
    throw new CJApiError(
      "CJ password not found in platform_settings (key: cj_credentials_secret). " +
      "Cannot refresh token automatically."
    );
  }

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: current.email, password }),
  });

  const json = await res.json();
  if (!json.result || !json.data?.accessToken) {
    throw new CJApiError(
      `CJ token refresh failed: ${json.message ?? "unknown error"}`,
      json.code,
      res.status
    );
  }

  // CJ returns expiry as a Unix timestamp in milliseconds
  const expiresAt = json.data.accessTokenExpiryDate
    ? new Date(json.data.accessTokenExpiryDate).toISOString()
    : null;

  const refreshed: StoredCredentials = {
    ...current,
    access_token: json.data.accessToken,
    refresh_token: json.data.refreshToken ?? current.refresh_token,
    token_expires_at: expiresAt,
  };

  await saveCredentials(refreshed);
  return refreshed;
}

/**
 * Get a valid (non-expired) access token, refreshing if necessary.
 * Use this before every CJ API call.
 */
async function getValidToken(): Promise<string> {
  let creds = await getCredentials();

  if (isTokenExpiringSoon(creds.token_expires_at)) {
    creds = await refreshAccessToken(creds);
  }

  return creds.access_token;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOW-LEVEL HTTP
// ─────────────────────────────────────────────────────────────────────────────

async function cjPost<T>(
  path: string,
  body: Record<string, unknown>,
  token: string
): Promise<T> {
  const res = await fetch(`${CJ_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok || !json.result) {
    throw new CJApiError(
      `CJ API error on ${path}: ${json.message ?? res.statusText}`,
      json.code,
      res.status
    );
  }

  return json.data as T;
}

async function cjGet<T>(
  path: string,
  params: Record<string, string>,
  token: string
): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${CJ_BASE}${path}?${qs}`, {
    method: "GET",
    headers: { "CJ-Access-Token": token },
  });

  const json = await res.json();

  if (!res.ok || !json.result) {
    throw new CJApiError(
      `CJ API error on ${path}: ${json.message ?? res.statusText}`,
      json.code,
      res.status
    );
  }

  return json.data as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch available shipping options for a set of CJ variants going to a country.
 *
 * Call this at checkout so the buyer can pick their preferred shipping method.
 * Store the chosen `logisticName` on the order and pass it to `submitOrderToCJ`.
 *
 * CJ endpoint: POST /logistic/freightCalculate
 */
export async function getCJShippingOptions(params: {
  countryCode: string;
  
  lines: Array<{ vid: string; quantity: number; weight?: number }>;
}): Promise<CJShippingOption[]> {
  const token = await getValidToken();
  
  const products = params.lines.map((l) => ({
    vid: l.vid,
    quantity: l.quantity,
    weight: l.weight ?? 0,
  }));

  const raw = await cjPost<any[]>(
    "/logistic/freightCalculate",
    {
      startCountryCode: "CN",
      endCountryCode: params.countryCode,
      products,
    },
    token
  );

  return (raw ?? []).map((r) => ({
    logisticName: r.logisticName,
    logisticAbbreviation: r.logisticAbbreviation ?? r.logisticName,
    logisticPrice: Number(r.logisticPrice ?? 0),
    logisticTime: r.logisticTime ?? "",
    trackable: r.isTracking === "YES",
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a confirmed order to CJ Dropshipping.
 *
 * Call this from your order-lifecycle handler AFTER payment is confirmed.
 * Writes cj_order_id, cj_order_num, cj_fulfillment_status back to orders.
 *
 * CJ endpoint: POST /shopping/order/createOrder
 */
export async function submitOrderToCJ(params: {
  /** Your internal Jimvio order ID — used as the CJ order reference. */
  orderId: string;
  lines: CJOrderLine[];
  shippingAddress: CJShippingAddress;
  /** Optional: buyer-chosen remark / gift message */
  remark?: string;
}): Promise<CJOrderResult> {
  const { orderId, lines, shippingAddress, remark } = params;

  if (!lines.length) {
    throw new CJApiError("Cannot submit CJ order with no line items");
  }

  for (const line of lines) {
    if (!line.vid) {
      throw new CJApiError(
        `Order ${orderId} has a CJ line item with no cj_vid. ` +
        "Check order_items.source_metadata.cj_vid."
      );
    }
  }

  const token = await getValidToken();
  const supabase = createServiceRoleClient();

  // ── Build CJ payload ────────────────────────────────────────────────────────
  const payload = {
    orderNumber: orderId,             // our reference — CJ returns it in webhooks
    shippingZip: shippingAddress.zip,
    shippingCountryCode: shippingAddress.countryCode,
    shippingCountry: shippingAddress.countryCode,
    shippingProvince: shippingAddress.province,
    shippingCity: shippingAddress.city,
    shippingAddress: shippingAddress.address,
    shippingAddress2: shippingAddress.address2 ?? "",
    shippingCustomerName: shippingAddress.name,
    shippingPhone: shippingAddress.phone,
    remark: remark ?? "",
    products: lines.map((l) => ({
      vid: l.vid,
      quantity: l.quantity,
      shippingName: l.shippingName,
    })),
  };

  let cjData: { orderId: string; orderNum: string };

  try {
    cjData = await cjPost<{ orderId: string; orderNum: string }>(
      "/shopping/order/createOrder",
      payload,
      token
    );
  } catch (err) {
    // Persist failure to order_status_history so ops can see it
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      previous_status: "confirmed",
      new_status: "processing",
      notes: `CJ order submission FAILED: ${(err as Error).message}`,
      metadata: { cj_error: (err as Error).message },
    });

    // Also log to failed_wallet_credits equivalent for ops visibility
    // (reusing the table since there's no dedicated failed_cj_orders table)
    await supabase.from("failed_wallet_credits").insert({
      order_id: orderId,
      vendor_id: null,   // platform-level failure
      amount: 0,
      currency: "USD",
      reason: `CJ submission failed: ${(err as Error).message}`,
      resolved: false,
    });

    throw err; // re-throw so the caller can decide whether to retry
  }

  // ── Write CJ references back to the order ───────────────────────────────────
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      cj_order_id: cjData.orderId,
      cj_order_num: cjData.orderNum,
      cj_fulfillment_status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) {
    // Non-fatal — CJ accepted the order, we just failed to persist the ref.
    // Log and continue so the order isn't blocked.
    console.error(
      `[CJ] Order ${orderId} submitted to CJ (${cjData.orderNum}) ` +
      `but DB write-back failed:`,
      updateErr
    );
  }

  // ── Status history ────────────────────────────────────────────────────────────
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    previous_status: "confirmed",
    new_status: "processing",
    notes: `Submitted to CJ Dropshipping. CJ order: ${cjData.orderNum}`,
    metadata: {
      cj_order_id: cjData.orderId,
      cj_order_num: cjData.orderNum,
    },
  });

  return {
    cjOrderId: cjData.orderId,
    cjOrderNum: cjData.orderNum,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER STATUS POLL
// ─────────────────────────────────────────────────────────────────────────────

// Map CJ's order status strings to your order_status enum
const CJ_STATUS_MAP: Record<string, string> = {
  CREATED:    "processing",
  PAYING:     "processing",
  IN_PROCESS: "processing",
  SHIPPED:    "shipped",
  FINISHED:   "delivered",
  CANCELLED:  "cancelled",
};

/**
 * Poll CJ for the current status of one order and sync it back to Supabase.
 *
 * Called by your cj-sync-fulfillment edge function (cron or webhook handler).
 *
 * CJ endpoint: GET /shopping/order/getOrderDetail
 */
export async function syncCJOrderStatus(params: {
  /** Your internal Jimvio order ID */
  orderId: string;
  /** The CJ order ID stored in orders.cj_order_id */
  cjOrderId: string;
}): Promise<{ updated: boolean; newStatus?: string }> {
  const { orderId, cjOrderId } = params;
  const token = await getValidToken();
  const supabase = createServiceRoleClient();

  // ── Fetch current state of the order from your DB ───────────────────────────
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("status, cj_fulfillment_status, tracking_number")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) {
    console.error(`[CJ sync] Order ${orderId} not found in DB`);
    return { updated: false };
  }

  // Skip orders already in a terminal state
  if (["delivered", "cancelled", "refunded"].includes(order.status)) {
    return { updated: false };
  }

  // ── Call CJ ─────────────────────────────────────────────────────────────────
  let detail: CJOrderDetail;
  try {
    detail = await cjGet<CJOrderDetail>(
      "/shopping/order/getOrderDetail",
      { orderId: cjOrderId },
      token
    );
  } catch (err) {
    console.error(`[CJ sync] Failed to fetch CJ order ${cjOrderId}:`, err);
    return { updated: false };
  }

  const mappedStatus = CJ_STATUS_MAP[detail.orderStatus] ?? "processing";
  const trackingChanged =
    detail.trackingNumber && detail.trackingNumber !== order.tracking_number;
  const statusChanged = mappedStatus !== order.status;

  if (!statusChanged && !trackingChanged) {
    return { updated: false };
  }

  // ── Write updates ────────────────────────────────────────────────────────────
  const updates: Record<string, unknown> = {
    cj_fulfillment_status: detail.orderStatus.toLowerCase(),
    updated_at: new Date().toISOString(),
  };

  if (trackingChanged) {
    updates.tracking_number = detail.trackingNumber;
    updates.tracking_status = "in_transit";
  }

  if (statusChanged) {
    updates.status = mappedStatus;
    if (mappedStatus === "shipped") updates.shipped_at = new Date().toISOString();
    if (mappedStatus === "delivered") updates.delivered_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId);

  if (updateErr) {
    console.error(`[CJ sync] DB update failed for order ${orderId}:`, updateErr);
    return { updated: false };
  }

  // ── Status history (only on status change) ───────────────────────────────────
  if (statusChanged) {
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      previous_status: order.status,
      new_status: mappedStatus,
      notes: `CJ fulfillment update: ${detail.orderStatus}`,
      metadata: {
        cj_order_id: cjOrderId,
        cj_status: detail.orderStatus,
        tracking_number: detail.trackingNumber ?? null,
      },
    });
  }

  return { updated: true, newStatus: mappedStatus };
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK SYNC (for cron edge function)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync all open CJ orders that haven't reached a terminal state.
 *
 * Designed to be called from a Supabase edge function on a schedule,
 * e.g. every 30 minutes.
 *
 * Returns a summary for logging into cj_sync_logs.
 */
export async function syncAllOpenCJOrders(): Promise<{
  total: number;
  updated: number;
  errors: number;
}> {
  const supabase = createServiceRoleClient();

  // Fetch all open CJ orders (have a cj_order_id but aren't terminal)
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, cj_order_id, status")
    .not("cj_order_id", "is", null)
    .not("status", "in", "(delivered,cancelled,refunded)")
    .order("created_at", { ascending: true });

  if (error || !orders?.length) {
    return { total: 0, updated: 0, errors: 0 };
  }

  let updated = 0;
  let errors = 0;

  // Process sequentially to avoid hammering CJ's API
  // (add p-limit if you have >50 open orders)
  for (const order of orders) {
    try {
      const result = await syncCJOrderStatus({
        orderId: order.id,
        cjOrderId: order.cj_order_id!,
      });
      if (result.updated) updated++;
    } catch (err) {
      errors++;
      console.error(`[CJ sync] Error syncing order ${order.id}:`, err);
    }
  }

  return { total: orders.length, updated, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTE / RETURN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * File a dispute (return/refund request) with CJ for a delivered order.
 *
 * CJ endpoint: POST /shopping/order/addDispute
 */
export async function fileCJDispute(params: {
  orderId: string;
  cjOrderId: string;
  reason: string;
  description: string;
  /** Image URLs as evidence (hosted publicly) */
  images?: string[];
}): Promise<{ cjDisputeId: string }> {
  const { orderId, cjOrderId, reason, description, images } = params;
  const token = await getValidToken();
  const supabase = createServiceRoleClient();

  const data = await cjPost<{ disputeId: string }>(
    "/shopping/order/addDispute",
    {
      orderId: cjOrderId,
      disputeType: reason,
      disputeDescription: description,
      disputeImages: images ?? [],
    },
    token
  );

  // Persist dispute ID
  await supabase
    .from("orders")
    .update({
      cj_dispute_id: data.disputeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    previous_status: "delivered",
    new_status: "refunded",
    notes: `CJ dispute filed. Dispute ID: ${data.disputeId}. Reason: ${reason}`,
    metadata: { cj_dispute_id: data.disputeId },
  });

  return { cjDisputeId: data.disputeId };
}