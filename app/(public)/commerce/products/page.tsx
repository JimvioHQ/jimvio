import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";

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
        <h1 className="text-xl font-semibold text-[#111827]">Products</h1>
        <p className="text-sm text-[#6B7280]">
          Create a store first, then publish catalog products to it.
        </p>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Go to Stores
        </Link>
      </div>
    );
  }

  const { data: links } = await db
    .from("jimvio_store_products")
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
          <h1 className="text-xl font-semibold text-[#111827]">Products</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Catalog products published to {active.name}.
          </p>
        </div>
        <Link
          href="/marketplace/physical"
          className="rounded-md bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
        >
          Browse marketplace to sell
        </Link>
      </div>

      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/products"
      />

      {!links?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No products on this store yet. Use “Sell to store” on a marketplace product.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Price</th>
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
                  status: string;
                } | null;
                return (
                  <tr key={row.id} className="border-b border-[#F3F4F6]">
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
                    <td className="px-4 py-3 text-[#6B7280]">{row.status}</td>
                    <td className="px-4 py-3 tabular-nums text-[#374151]">
                      {p ? `${p.currency || "USD"} ${Number(p.price).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
