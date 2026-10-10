import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { getCart } from "@/lib/actions/marketplace";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
import { formatStoreMoney } from "@/lib/commerce-os/storefront/money";
import { productImageAt } from "@/lib/commerce-os/storefront/product-media";
import { StorefrontCheckoutButton } from "@/components/commerce-os/storefront-checkout-button";
import { StorefrontCartLineControls } from "@/components/commerce-os/storefront-cart-line-controls";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ error?: string }>;
};

const CART_ERRORS: Record<string, string> = {
  order_not_found: "That order could not be found or is no longer waiting for payment.",
  sync_failed: "Checkout could not refresh this order. Your cart is unchanged.",
  cart_empty: "This checkout no longer matches your cart. Review the items below and try again.",
  mixed_products: "Digital and physical products need to be checked out separately.",
  no_items: "This order has no items. Your cart is unchanged.",
};

export default async function StorefrontCartPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const { error: cartError } = await searchParams;
  const onStoreHost = await isRequestOnStoreHost();
  const linkOpts = { onStoreHost };
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) redirect("/");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = storefrontHref(handle, "/cart", linkOpts);
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { items, total } = await getCart({
    jimvioStoreId: store.id,
    jimvioStoreHandle: handle,
  });
  const currency = store.default_currency || "USD";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1
        className="text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--store-heading-font, inherit)" }}
      >
        Cart
      </h1>
      <p className="mt-1 text-sm text-[var(--store-muted,#6B7280)]">
        Items in this cart belong to {store.name} only.
      </p>
      {cartError && CART_ERRORS[cartError] ? (
        <p
          className="mt-4 rounded-[var(--store-card-radius,16px)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {CART_ERRORS[cartError]}
        </p>
      ) : null}

      {!items.length ? (
        <div className="mt-8 rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)] p-6 text-sm text-[var(--store-muted,#6B7280)]">
          Your cart is empty.{" "}
          <Link
            href={storefrontHref(handle, "/collections/all", linkOpts)}
            className="font-semibold text-[var(--store-primary,#FF5A1F)] underline"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map(
            (item: {
              id: string;
              quantity: number;
              unit_price_at_add: number;
              product_variants?: {
                name?: string | null;
                options?: Record<string, unknown> | null;
              } | null;
              products?: {
                name?: string;
                slug?: string;
                images?: unknown;
              } | null;
            }) => {
              const img = productImageAt(item.products?.images, 0);
              const variantLabel =
                item.product_variants?.name ||
                (item.product_variants?.options &&
                typeof item.product_variants.options === "object"
                  ? Object.entries(item.product_variants.options)
                      .filter(
                        ([k, v]) =>
                          typeof v === "string" &&
                          !["variant_key", "sku", "vid", "pid"].includes(
                            k.toLowerCase()
                          )
                      )
                      .map(([, v]) => v)
                      .join(" / ")
                  : null);
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)] px-3 py-3 text-sm"
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-[var(--store-bg,#F8FAFC)] text-[10px] text-[var(--store-muted,#6B7280)]">
                      No image
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {item.products?.slug ? (
                      <Link
                        href={storefrontHref(
                          handle,
                          `/product/${item.products.slug}`,
                          linkOpts
                        )}
                        className="font-medium text-[var(--store-text,#111827)]"
                      >
                        {item.products?.name || "Product"}
                      </Link>
                    ) : (
                      <p className="font-medium">
                        {item.products?.name || "Product"}
                      </p>
                    )}
                    {variantLabel ? (
                      <p className="mt-0.5 text-xs text-[var(--store-muted,#6B7280)]">
                        {variantLabel}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-[var(--store-muted,#6B7280)]">
                      {formatStoreMoney(item.unit_price_at_add, currency)} each
                    </p>
                    <StorefrontCartLineControls
                      itemId={item.id}
                      quantity={item.quantity}
                    />
                  </div>
                  <p className="shrink-0 tabular-nums font-semibold">
                    {formatStoreMoney(
                      Number(item.unit_price_at_add) * Number(item.quantity),
                      currency
                    )}
                  </p>
                </li>
              );
            }
          )}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--store-border,rgba(0,0,0,0.08))] pt-4">
        <p className="text-sm font-semibold tabular-nums">
          Subtotal: {formatStoreMoney(total, currency)}
        </p>
        <div className="flex gap-2">
          <Link
            href={storefrontHref(handle, "/collections/all", linkOpts)}
            className="rounded-[var(--store-btn-radius,9999px)] border border-[var(--store-border,rgba(0,0,0,0.1))] px-4 py-2.5 text-xs font-semibold"
          >
            Continue shopping
          </Link>
          {items.length ? (
            <StorefrontCheckoutButton
              handle={handle}
              onStoreHost={onStoreHost}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
