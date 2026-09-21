import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ order?: string; order_id?: string; orderId?: string }>;
};

export default async function StorefrontCheckoutCancelPage({
  params,
  searchParams,
}: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  const onStoreHost = await isRequestOnStoreHost();
  const linkOpts = { onStoreHost };
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const orderId = sp.orderId ?? sp.order_id ?? sp.order ?? null;
  const cartHref = storefrontHref(handle, "/cart", linkOpts);
  const checkoutHref = orderId
    ? `${storefrontHref(handle, "/checkout", linkOpts)}?order_id=${encodeURIComponent(orderId)}`
    : storefrontHref(handle, "/checkout", linkOpts);
  const contactHref = storefrontHref(
    handle,
    onStoreHost ? "/contact" : "/pages/contact",
    linkOpts
  );

  const logo =
    typeof store.logo_url === "string" && store.logo_url.trim()
      ? store.logo_url.trim()
      : null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="h-9 w-auto max-w-[140px] object-contain"
          />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--store-primary,#FF5A1F)] text-xs font-bold text-white">
            {store.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <p className="text-sm font-semibold">{store.name}</p>
      </div>
      <h1
        className="text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--store-heading-font, inherit)" }}
      >
        Payment wasn&apos;t completed.
      </h1>
      <p className="mt-2 text-sm text-[var(--store-muted,#6B7280)]">
        Nothing was charged. Your cart is still saved — you can try again or
        return to shopping.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Link
          href={checkoutHref}
          className="inline-flex h-11 items-center justify-center rounded-[var(--store-btn-radius,9999px)] bg-[var(--store-primary,#FF5A1F)] px-5 text-sm font-semibold text-white"
        >
          Try again
        </Link>
        <Link
          href={cartHref}
          className="inline-flex h-11 items-center justify-center rounded-[var(--store-btn-radius,9999px)] border border-[var(--store-border,rgba(0,0,0,0.12))] px-5 text-sm font-semibold"
        >
          Return to cart
        </Link>
        <Link
          href={contactHref}
          className="inline-flex h-11 items-center justify-center rounded-[var(--store-btn-radius,9999px)] px-5 text-sm font-semibold text-[var(--store-muted,#6B7280)] underline"
        >
          Contact store
        </Link>
      </div>
      <p className="mt-8 text-center text-[11px] text-[var(--store-muted,#9CA3AF)]">
        Payment cancelled
      </p>
    </div>
  );
}
