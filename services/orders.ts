import { getDB, getAdminDB } from "./base";

/** getAdminOrders */
export async function getAdminOrders(arg1?: string | number, arg2 = 50) {
  const admin = getAdminDB();
  const query = typeof arg1 === "string" ? arg1 : undefined;
  const limit = typeof arg1 === "number" ? arg1 : arg2;

  let q = admin.from("orders").select(`
    id, order_number, status, payment_status, total_amount, currency, created_at,
    profiles ( email, full_name ),
    vendors ( business_name, business_slug )
  `, { count: "exact" });

  if (query) {
    q = q.or(`order_number.ilike.%${query}%,profiles.email.ilike.%${query}%`);
  }

  const { data, count } = await q.order("created_at", { ascending: false }).limit(limit);
  return { orders: data ?? [], total: count ?? 0 };
}

// ─────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────

export async function getBuyerOrders(userId: string) {
  const db = await getDB();
  const { data } = await db
    .from("orders")
    .select(`
      id, order_number, status, payment_status, total_amount,
      currency, created_at, paid_at, shipped_at, delivered_at,
      order_items (
        id, product_name, product_image, quantity, unit_price, total_price,
        vendor_id, product_type, digital_download_url, access_granted_at,
        vendors ( id, business_name, business_slug )
      )
    `)
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getOrderById(orderId: string, userId?: string) {
  const db = await getDB();
  let q = db
    .from("orders")
    .select(`
      id, order_number, status, payment_status, total_amount,
      currency, created_at, paid_at, shipped_at, delivered_at, buyer_id,
      order_items (
        id, product_name, product_image, quantity, unit_price, total_price,
        vendor_id, product_type, digital_download_url, access_granted_at,
        vendors ( id, business_name, business_slug )
      )
    `)
    .eq("id", orderId);
  if (userId) q = q.eq("buyer_id", userId);
  const { data } = await q.single();
  return data;
}

export async function getVendorOrders(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("orders")
    .select(`
      id, order_number, status, payment_status, total_amount,
      currency, created_at, paid_at,
      profiles ( full_name, email, avatar_url ),
      order_items!inner ( id, product_name, quantity, unit_price, total_price, vendor_id )
    `)
    .eq("order_items.vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// REVENUE CHART DATA (monthly)
// ─────────────────────────────────────────────────────────────

export async function getRevenueChartData(vendorId?: string) {
  const db = await getDB();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return { month: d.toLocaleString("default", { month: "short" }), year: d.getFullYear(), num: d.getMonth() + 1 };
  });

  let q = db.from("order_items").select("total_price, created_at");
  if (vendorId) q = q.eq("vendor_id", vendorId);

  const { data: items } = await q
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  const byMonth: Record<string, number> = {};
  items?.forEach(item => {
    const d = new Date(item.created_at ?? "");
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    byMonth[key] = (byMonth[key] ?? 0) + Number(item.total_price);
  });

  return months.map(m => ({
    month: m.month,
    revenue: byMonth[`${m.year}-${m.num}`] ?? 0,
    orders: 0,
    affiliate: 0,
  }));
}

// ─────────────────────────────────────────────────────────────
// RECENT ORDERS (for dashboard)
// ─────────────────────────────────────────────────────────────

export async function getRecentVendorOrders(vendorId: string, limit = 5) {
  const db = await getDB();
  const { data } = await db
    .from("orders")
    .select(`
      id, order_number, status, total_amount, currency, created_at,
      profiles ( full_name, email ),
      order_items!inner ( product_name, vendor_id )
    `)
    .eq("order_items.vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
