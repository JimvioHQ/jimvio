import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import {
  CommerceCard,
  CommerceEmptyState,
} from "@/components/commerce-os/commerce-shell";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceProductsPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/products");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
          Products
        </h1>
        <p className="text-sm text-[#6B7280]">
          Create a store first, then publish catalog products to it.
        </p>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Go to Stores
        </Link>
      </div>
    );
  }

  const { data: links } = await cosTable(db, "jimvio_store_products")
    .select(
      "id, status, published_at, sort_order, products(id, name, slug, price, currency, images, inventory_quantity, status)"
    )
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
            Products
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Catalog products published to {active.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/marketplace/physical"
            className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
          >
            Import from Marketplace
          </Link>
          <Link
            href="/seller/products"
            className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#374151]"
          >
            Add Product
          </Link>
        </div>
      </div>

      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/products"
      />

      {!links?.length ? (
        <CommerceEmptyState
          title="No products yet"
          description="Add your first product to start selling, or import from the Jimvio Marketplace."
          action={
            <Link
              href="/marketplace/physical"
              className="rounded-xl bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white"
            >
              Browse Marketplace
            </Link>
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {links.map((row) => {
              const p = row.products as unknown as {
                id: string;
                name: string;
                slug: string;
                price: number;
                currency: string;
                inventory_quantity: number | null;
              } | null;
              return (
                <CommerceCard key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {p ? (
                        <Link
                          href={`/s/${active.handle}/product/${p.slug}`}
                          className="font-semibold text-[#111827]"
                        >
                          {p.name}
                        </Link>
                      ) : (
                        <span className="text-[#6B7280]">—</span>
                      )}
                      <p className="mt-1 text-xs text-[#9CA3AF]">
                        {row.status}
                        {p?.inventory_quantity != null
                          ? ` · ${p.inventory_quantity} in stock`
                          : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {p
                        ? `${p.currency || "USD"} ${Number(p.price).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                </CommerceCard>
              );
            })}
          </div>

          {/* Desktop table */}
          <CommerceCard className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Inventory</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {links.map((row) => {
                  const p = row.products as unknown as {
                    id: string;
                    name: string;
                    slug: string;
                    price: number;
                    currency: string;
                    inventory_quantity: number | null;
                  } | null;
                  return (
                    <tr key={row.id} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="px-4 py-3">
                        {p ? (
                          <Link
                            href={`/s/${active.handle}/product/${p.slug}`}
                            className="font-medium text-[#111827] hover:text-[#FF5A1F]"
                          >
                            {p.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#4B5563]">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#6B7280]">
                        {p?.inventory_quantity ?? "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#374151]">
                        {p
                          ? `${p.currency || "USD"} ${Number(p.price).toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CommerceCard>
        </>
      )}
    </div>
  );
}
