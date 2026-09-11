import type { SupabaseClient } from "@supabase/supabase-js";
import { cosTable } from "../db";
import { getStoreAnalytics } from "./overview";

export type SetupChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export type OverviewDashboard = Awaited<ReturnType<typeof getCommerceOverviewDashboard>>;

export async function getCommerceOverviewDashboard(
  db: SupabaseClient,
  storeId: string,
  vendorId: string,
  storeHandle: string,
  days = 30
) {
  const analytics = await getStoreAnalytics(db, storeId, vendorId, days);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentOrders } = await db
    .from("orders")
    .select(
      "id, order_number, total_amount, currency, payment_status, status, created_at"
    )
    .eq("jimvio_store_id", storeId)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: orderBuyers } = await db
    .from("orders")
    .select("buyer_id")
    .eq("jimvio_store_id", storeId)
    .eq("vendor_id", vendorId)
    .not("buyer_id", "is", null);

  const customerIds = new Set(
    (orderBuyers ?? []).map((o) => o.buyer_id).filter(Boolean) as string[]
  );

  const { data: productLinks } = await cosTable(db, "jimvio_store_products")
    .select(
      "id, status, products(id, name, price, currency, images, inventory_quantity)"
    )
    .eq("store_id", storeId)
    .eq("vendor_id", vendorId)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .limit(8);

  const { count: collectionCount } = await cosTable(db, "jimvio_store_collections")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { count: shippingZoneCount } = await cosTable(db, "jimvio_shipping_zones")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { count: domainCount } = await cosTable(db, "jimvio_store_domains")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { data: storeRow } = await cosTable(db, "jimvio_stores")
    .select("status, published_theme, theme_id, settings, primary_domain")
    .eq("id", storeId)
    .maybeSingle();

  const storeSettings =
    storeRow?.settings && typeof storeRow.settings === "object" && !Array.isArray(storeRow.settings)
      ? (storeRow.settings as Record<string, unknown>)
      : {};

  // Platform payments are shared — treat as configured when merchant marked ready or has paid store order
  const { count: paidStoreOrders } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("jimvio_store_id", storeId)
    .eq("vendor_id", vendorId)
    .in("payment_status", ["paid", "completed"]);

  const hasProducts = (analytics.productsPublished ?? 0) > 0;
  const hasPayments =
    storeSettings.payments_configured === true || (paidStoreOrders ?? 0) > 0;
  const hasShipping = (shippingZoneCount ?? 0) > 0;
  const publishedTheme = storeRow?.published_theme;
  const hasPublishedThemeContent =
    publishedTheme &&
    typeof publishedTheme === "object" &&
    !Array.isArray(publishedTheme) &&
    Object.keys(publishedTheme as object).length > 0;
  const hasTheme = Boolean(storeRow?.theme_id) || Boolean(hasPublishedThemeContent);
  const hasDomain = (domainCount ?? 0) > 0 || Boolean(storeRow?.primary_domain);
  const storeLive = storeRow?.status === "published";

  const checklist: SetupChecklistItem[] = [
    {
      id: "store",
      label: "Store setup",
      done: true,
      href: `/commerce/settings?storeId=${storeId}`,
    },
    {
      id: "products",
      label: "Add products",
      done: hasProducts,
      href: `/commerce/products?storeId=${storeId}`,
    },
    {
      id: "payments",
      label: "Configure payments",
      done: hasPayments,
      href: `/commerce/payments?storeId=${storeId}`,
    },
    {
      id: "shipping",
      label: "Set up shipping",
      done: hasShipping,
      href: `/commerce/shipping?storeId=${storeId}`,
    },
    {
      id: "theme",
      label: "Customize design",
      done: hasTheme,
      href: `/commerce/builder?storeId=${storeId}`,
    },
    {
      id: "domain",
      label: "Connect domain",
      done: hasDomain,
      href: `/commerce/domains?storeId=${storeId}`,
    },
  ];

  const topProducts = (productLinks ?? []).map((row) => {
    const p = row.products as unknown as {
      id: string;
      name: string;
      price: number;
      currency: string;
      images: unknown;
      inventory_quantity: number | null;
    } | null;
    const images = Array.isArray(p?.images) ? p!.images : [];
    const image =
      typeof images[0] === "string"
        ? images[0]
        : images[0] && typeof images[0] === "object" && "url" in (images[0] as object)
          ? String((images[0] as { url: string }).url)
          : null;
    return {
      id: p?.id ?? row.id,
      name: p?.name ?? "Product",
      price: Number(p?.price ?? 0),
      currency: p?.currency ?? "USD",
      image,
      soldLabel: "0 sold",
    };
  });

  return {
    analytics: {
      ...analytics,
      customers: customerIds.size,
      collections: collectionCount ?? 0,
      rangeDays: days,
      since,
    },
    recentOrders: recentOrders ?? [],
    topProducts,
    checklist,
    storeLive,
    storefrontPath: `/s/${storeHandle}`,
    storefrontUrl: `https://${storeHandle}.jimvio.com`,
  };
}
