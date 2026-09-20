import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
import { formatStoreMoney } from "@/lib/commerce-os/storefront/money";
import { StorefrontSignOutButton } from "@/components/commerce-os/storefront-sign-out-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

function statusLabel(payment: string | null, fulfillment: string | null) {
  const p = (payment || "").toLowerCase();
  const f = (fulfillment || "").toLowerCase();
  if (p === "refunded" || f === "refunded") return "Refunded";
  if (f === "cancelled" || p === "cancelled") return "Cancelled";
  if (f === "delivered") return "Delivered";
  if (f === "shipped") return "Shipped";
  if (p === "paid" || p === "completed") return "Paid";
  if (p === "pending" || p === "failed") return "Pending payment";
  return fulfillment || payment || "Processing";
}

export default async function StorefrontAccountPage({ params }: Props) {
  const { handle } = await params;
  const onStoreHost = await isRequestOnStoreHost();
  const linkOpts = { onStoreHost };
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = storefrontHref(handle, "/account", linkOpts);
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, total_amount, currency, payment_status, status, created_at"
    )
    .eq("buyer_id", user.id)
    .eq("jimvio_store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const displayName =
    profile?.full_name?.trim() ||
    profile?.email?.trim() ||
    user.email ||
    "Customer";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1
        className="text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--store-heading-font, inherit)" }}
      >
        My account
      </h1>
      <p className="mt-1 text-sm text-[var(--store-muted,#6B7280)]">
        {store.name} · {displayName}
      </p>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
        <Link
          href={storefrontHref(handle, "/account", linkOpts)}
          className="rounded-full bg-[var(--store-primary,#FF5A1F)] px-3 py-1.5 text-white"
        >
          Overview
        </Link>
        <Link
          href={storefrontHref(handle, "/account/orders", linkOpts)}
          className="rounded-full border border-[var(--store-border,rgba(0,0,0,0.1))] px-3 py-1.5"
        >
          Orders
        </Link>
        <StorefrontSignOutButton
          nextHref={storefrontHref(handle, "", linkOpts)}
          className="rounded-full px-3 py-1.5 text-[var(--store-muted,#6B7280)]"
        />
      </nav>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--store-muted,#6B7280)]">
            Recent orders
          </h2>
          <Link
            href={storefrontHref(handle, "/account/orders", linkOpts)}
            className="text-xs font-semibold text-[var(--store-primary,#FF5A1F)]"
          >
            View all
          </Link>
        </div>

        {!orders?.length ? (
          <div className="mt-4 rounded-[var(--store-card-radius,16px)] border border-dashed border-[var(--store-border,rgba(0,0,0,0.12))] p-6 text-sm text-[var(--store-muted,#6B7280)]">
            <p className="font-medium text-[var(--store-text,#111827)]">
              No orders yet
            </p>
            <p className="mt-1">
              Orders will appear here after you complete checkout at this store.
            </p>
            <Link
              href={storefrontHref(handle, "/collections/all", linkOpts)}
              className="mt-4 inline-flex rounded-[var(--store-btn-radius,9999px)] bg-[var(--store-primary,#FF5A1F)] px-4 py-2 text-xs font-semibold text-white"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={storefrontHref(handle, `/account/orders/${o.id}`, linkOpts)}
                  className="flex items-center justify-between gap-3 rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)] px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">
                      {o.order_number ? `#${o.order_number}` : o.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-[var(--store-muted,#6B7280)]">
                      {statusLabel(o.payment_status, o.status)} ·{" "}
                      {o.created_at
                        ? new Date(o.created_at).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                  <p className="tabular-nums font-semibold">
                    {formatStoreMoney(
                      Number(o.total_amount || 0),
                      o.currency || store.default_currency || "USD"
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
