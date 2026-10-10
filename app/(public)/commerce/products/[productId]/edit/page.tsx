import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";
import { StoreProductEditor } from "@/components/commerce-os/store-product-editor";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ storeId?: string }>;
};

function asImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export default async function CommerceProductEditPage({ params, searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/products");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { productId } = await params;
  const { storeId } = await searchParams;
  if (!storeId) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-[#111827]">Edit Product</h1>
        <p className="text-sm text-[#6B7280]">Choose a store before editing this product.</p>
        <Link href="/commerce/products" className="text-sm font-semibold text-[#FF5A1F]">
          Back to products
        </Link>
      </div>
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, storeId, auth.vendorId);
  if (!owned) notFound();

  const { data: link } = await cosTable(db, "jimvio_store_products")
    .select("id")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();
  if (!link) notFound();

  const { data: product } = await db
    .from("products")
    .select("id, name, description, images, price, currency, sku")
    .eq("id", productId)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();
  if (!product) notFound();

  const { count } = await db
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  return (
    <StoreProductEditor
      storeId={storeId}
      product={{
        id: product.id,
        name: product.name,
        description: product.description || "",
        images: asImages(product.images),
        price: Number(product.price || 0),
        currency: product.currency || "USD",
        sku: product.sku,
        variantCount: count || 0,
      }}
    />
  );
}
