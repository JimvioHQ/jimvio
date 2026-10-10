import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { ProductsCatalog, type CatalogProduct } from "@/components/commerce-os/products-catalog";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

function asImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

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
      "id, status, published_at, sort_order, updated_at, products(id, name, slug, sku, price, currency, images, inventory_quantity, track_inventory, low_stock_threshold, status, updated_at)",
    )
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("sort_order", { ascending: true });

  const productIds = (links ?? [])
    .map((row) => {
      const p = row.products as unknown as { id?: string } | null;
      return p?.id;
    })
    .filter((id): id is string => Boolean(id));

  const variantCountByProduct = new Map<string, number>();
  if (productIds.length) {
    const { data: variants } = await db
      .from("product_variants")
      .select("product_id")
      .in("product_id", productIds);
    for (const v of variants ?? []) {
      if (!v.product_id) continue;
      variantCountByProduct.set(
        v.product_id,
        (variantCountByProduct.get(v.product_id) || 0) + 1,
      );
    }
  }

  const products: CatalogProduct[] = (links ?? []).flatMap((row) => {
    const p = row.products as unknown as {
      id: string;
      name: string;
      slug: string;
      sku: string | null;
      price: number;
      currency: string;
      images: unknown;
      inventory_quantity: number | null;
      track_inventory: boolean | null;
      low_stock_threshold: number | null;
      status: string | null;
      updated_at: string | null;
    } | null;
    if (!p?.id) return [];
    return [
      {
        linkId: row.id,
        productId: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: Number(p.price || 0),
        currency: p.currency || "USD",
        status: row.status,
        productStatus: p.status,
        inventory: p.inventory_quantity,
        trackInventory: Boolean(p.track_inventory),
        lowStockThreshold: Number(p.low_stock_threshold ?? 5),
        images: asImages(p.images),
        updatedAt: row.updated_at || p.updated_at,
        variantCount: variantCountByProduct.get(p.id) || 1,
      },
    ];
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
            Products
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage everything you sell from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/commerce/products/import?storeId=${active.id}`}
            className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
          >
            Import from Marketplace
          </Link>
        </div>
      </div>

      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/products"
      />

      <ProductsCatalog
        storeId={active.id}
        storeHandle={active.handle}
        products={products}
      />
    </div>
  );
}
