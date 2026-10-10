import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { syncOrderWithCart } from "@/lib/actions/checkout";
import { sanitizeCustomerOrderMetadata } from "@/lib/orders/customer-order-fields";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePendingOrderPlatformCurrency } from "@/lib/commerce/ensure-platform-currency";
import { getOrRefreshAccessToken } from "@/lib/cj/auth";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{
    order_id?: string;
    order?: string;
    orderId?: string;
    method?: string;
    direct?: string;
  }>;
};

type OrderItemRow = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_type: string | null;
  pricing_type: string | null;
  billing_period: string | null;
  product_source: string;
  cj_vid: string | null;
  variant_weight: number | null;
  source_metadata: Record<string, unknown> | null;
};

const ORDER_SELECT = `
  id, status, payment_status,
  total_amount, subtotal, shipping_amount, currency,
  integration_source, metadata, shipping_address, jimvio_store_id,
  vendors (id, business_name, business_slug),
  order_items (
    id, product_id, variant_id, product_name, product_image,
    quantity, unit_price, total_price,
    product_type, pricing_type, billing_period,
    product_source, source_metadata,
    product_variants (cj_vid, weight, length, width, height, source_metadata)
  )
` as const;

function metaString(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function metaNumber(meta: unknown, key: string): number | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const value = Number((meta as Record<string, unknown>)[key]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function flattenOrderItems(rawItems: unknown[]): OrderItemRow[] {
  return (rawItems ?? []).map((raw) => {
    const item = raw as Record<string, unknown>;
    const variantRaw = item.product_variants;
    const variant = Array.isArray(variantRaw)
      ? (variantRaw[0] as Record<string, unknown> | undefined)
      : (variantRaw as Record<string, unknown> | null);
    const itemMeta = (item.source_metadata as Record<string, unknown> | null) ?? null;
    const variantMeta =
      (variant?.source_metadata as Record<string, unknown> | null) ?? null;
    return {
      id: String(item.id),
      product_id: (item.product_id as string) ?? null,
      variant_id: (item.variant_id as string) ?? null,
      product_name: String(item.product_name ?? "Product"),
      product_image: (item.product_image as string) ?? null,
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      total_price: Number(item.total_price ?? 0),
      product_type: (item.product_type as string) ?? null,
      pricing_type: (item.pricing_type as string) ?? null,
      billing_period: (item.billing_period as string) ?? null,
      product_source: String(item.product_source ?? "vendor"),
      cj_vid:
        (variant?.cj_vid as string) ??
        metaString(variantMeta, "cj_vid") ??
        metaString(itemMeta, "cj_vid") ??
        null,
      variant_weight:
        (variant?.weight as number) ??
        metaNumber(variantMeta, "cj_weight") ??
        metaNumber(itemMeta, "cj_weight") ??
        null,
      source_metadata: itemMeta,
    };
  });
}

export default async function StorefrontCheckoutPage({
  params,
  searchParams,
}: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  const onStoreHost = await isRequestOnStoreHost();
  const linkOpts = { onStoreHost };
  const cartHref = storefrontHref(handle, "/cart", linkOpts);
  const loginNext = storefrontHref(handle, "/checkout", linkOpts);

  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orderId = sp.orderId ?? sp.order_id ?? sp.order ?? null;
  const preferredMethod = sp.method ?? null;
  const isDirectCheckout = sp.direct === "1";

  if (!user) {
    const next = orderId
      ? `${loginNext}?order_id=${encodeURIComponent(orderId)}`
      : loginNext;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (!orderId) {
    redirect(cartHref);
  }

  let syncResult: Awaited<ReturnType<typeof syncOrderWithCart>> | null = null;
  if (!isDirectCheckout) {
    syncResult = await syncOrderWithCart(orderId);
    if (!syncResult.ok) {
      const code =
        syncResult.error === "cart_empty" ? "cart_empty" : "sync_failed";
      redirect(`${cartHref}?error=${code}`);
    }
  }

  const { data: rawOrder, error: orderError } = await cosTable(supabase, "orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .in("payment_status", ["pending", "failed"])
    .single();

  if (orderError || !rawOrder) {
    redirect(`${cartHref}?error=order_not_found`);
  }

  // Tenant guard: order must already belong to this store. Never attach
  // unscoped marketplace orders onto a merchant checkout (attribution hijack).
  const orderStoreId = (rawOrder as { jimvio_store_id?: string | null })
    .jimvio_store_id;
  if (!orderStoreId || orderStoreId !== store.id) {
    redirect(`${cartHref}?error=order_not_found`);
  }

  const order = {
    id: rawOrder.id,
    status: rawOrder.status,
    payment_status: rawOrder.payment_status,
    total_amount: rawOrder.total_amount,
    subtotal: rawOrder.subtotal,
    shipping_amount: rawOrder.shipping_amount ?? null,
    currency: rawOrder.currency ?? null,
    metadata: sanitizeCustomerOrderMetadata(rawOrder.metadata),
    shipping_address: rawOrder.shipping_address ?? null,
    vendors: Array.isArray(rawOrder.vendors)
      ? rawOrder.vendors[0] ?? null
      : rawOrder.vendors,
    order_items: flattenOrderItems(
      (rawOrder.order_items as unknown[]) ?? []
    ),
  };

  const types = new Set(order.order_items.map((i) => i.product_type));
  if (types.has("digital") && types.has("physical")) {
    redirect(`${cartHref}?error=mixed_products`);
  }
  if (!order.order_items.length) {
    redirect(`${cartHref}?error=no_items`);
  }

  try {
    await ensurePendingOrderPlatformCurrency(createAdminClient(), order.id);
  } catch {
    /* non-fatal */
  }

  if (order.order_items.some((item) => item.product_source === "cj")) {
    try {
      await getOrRefreshAccessToken();
    } catch {
      /* non-fatal */
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  const logo =
    typeof store.logo_url === "string" && store.logo_url.trim()
      ? store.logo_url.trim()
      : null;

  return (
    <div className="min-h-screen bg-[var(--store-bg,#F8FAFC)]">
      <header className="border-b border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-8 w-auto max-w-[140px] object-contain" />
          ) : (
            <span
              className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--store-primary,#FF5A1F)] text-xs font-bold text-white"
              aria-hidden
            >
              {store.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--store-text,#111827)]">
              {store.name}
            </p>
            <p className="text-xs text-[var(--store-muted,#6B7280)]">Secure checkout</p>
          </div>
          <a
            href={cartHref}
            className="ml-auto text-xs font-semibold text-[var(--store-muted,#6B7280)] underline"
          >
            Back to cart
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-8xl px-0 sm:px-4 md:px-6">
        <CheckoutExperience
          orders={[order] as never}
          profile={profile}
          mode="cart"
          preferredMethod={preferredMethod}
          cartWasUpdated={!isDirectCheckout && (syncResult?.changed ?? false)}
          changes={!isDirectCheckout ? syncResult?.changes : undefined}
          brandSurface="merchant"
          storeName={store.name}
        />
      </div>
      <p className="pb-8 text-center text-[11px] text-[var(--store-muted,#9CA3AF)]">
        Payments processed securely
      </p>
    </div>
  );
}
