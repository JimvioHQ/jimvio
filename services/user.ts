import { getDB, getAdminDB } from "./base";

/** getAdminUsers (global user management). */
export async function getAdminUsers(query?: string, limit = 100) {
  const admin = getAdminDB();
  let q = admin.from("profiles").select(`
    id, email, full_name, avatar_url, created_at,
    roles: user_roles(role)
  `, { count: "exact" });

  if (query) {
    q = q.or(`email.ilike.%${query}%,full_name.ilike.%${query}%`);
  }

  const { data, count } = await q.order("created_at", { ascending: false }).limit(limit);

  const users = data?.map((u: any) => ({
    ...u,
    roles: u.roles?.map((r: any) => r.role) ?? []
  })) ?? [];

  return { users, total: count ?? 0 };
}

// ─────────────────────────────────────────────────────────────
// USER DASHBOARD / ACCOUNT
// ─────────────────────────────────────────────────────────────

export async function getUserNavbarCounts(userId: string) {
  const db = await getDB();
  const [cart, notifications] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", userId).eq("status", "pending"),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
  ]);

  return {
    cartCount: cart.count ?? 0,
    chatCount: notifications.count ?? 0, // Mocking chat with unread notifications for now
  };
}

export async function getUserWallet(userId: string) {
  const db = await getDB();
  const { data } = await db
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function getUserNotifications(userId: string, limit = 20) {
  const db = await getDB();
  const { data } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUnreadNotificationCount(userId: string) {
  const db = await getDB();
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}

export async function getUserWishlist(userId: string) {
  const db = await getDB();
  const { data } = await db
    .from("wishlists")
    .select(`
      id, created_at,
      products ( id, name, slug, price, currency, images, rating, review_count, inventory_quantity, vendors ( id, business_name, business_slug ) )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
