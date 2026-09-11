import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping";

export const dynamic = "force-dynamic";

export default async function DropshippingProductsPage() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/dropshipping/products");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const db = dsAdminDb();
  const { data: links, error } = await db
    .from("store_product_links")
    .select(
      "id, store_id, product_id, store_product_id, store_variant_id, connection_status, pricing, published_at, updated_at, products(id, name, slug, price, currency), merchant_stores(id, name, domain)"
    )
    .eq("vendor_id", auth.vendorId)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Products</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Products imported from Jimvio into your connected stores.
        </p>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600">{error.message}</p>
      ) : null}

      {!links?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No imported products yet. Open a marketplace product and use{" "}
          <span className="font-medium text-[#111827]">Sell This Product</span>.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Store</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Selling price</th>
              </tr>
            </thead>
            <tbody>
              {links.map((row) => {
                const product = Array.isArray(row.products)
                  ? row.products[0]
                  : row.products;
                const store = Array.isArray(row.merchant_stores)
                  ? row.merchant_stores[0]
                  : row.merchant_stores;
                const pricing = (row.pricing as { selling_price?: number }) || {};
                return (
                  <tr key={row.id} className="border-b border-[#F3F4F6]">
                    <td className="px-3 py-2.5">
                      {product?.slug ? (
                        <Link
                          href={`/marketplace/${product.slug}`}
                          className="font-medium text-[#111827] hover:text-[#FF5A1F]"
                        >
                          {product.name}
                        </Link>
                      ) : (
                        <span>{product?.name ?? row.product_id}</span>
                      )}
                      <p className="text-[11px] text-[#9CA3AF]">
                        store product {row.store_product_id}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-[#4B5563]">
                      {(store as { name?: string } | null)?.name ?? row.store_id}
                    </td>
                    <td className="px-3 py-2.5 text-[#4B5563]">{row.connection_status}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#111827]">
                      {pricing.selling_price != null
                        ? Number(pricing.selling_price).toFixed(2)
                        : "—"}
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
