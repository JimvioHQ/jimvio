import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";
import { buildStoreProductUpdate } from "@/lib/commerce-os/product-editor";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ productId: string }> };

function asImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

async function loadOwnedProduct(
  storeId: string,
  productId: string,
  vendorId: string,
) {
  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, storeId, vendorId);
  if (!owned) return { db, product: null, error: "Store not found.", status: 404 as const };
  const { data: link } = await cosTable(db, "jimvio_store_products")
    .select("id, status")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (!link) return { db, product: null, error: "Product not found.", status: 404 as const };

  const { data: product } = await db
    .from("products")
    .select(
      "id, vendor_id, name, description, images, price, currency, sku, slug, status",
    )
    .eq("id", productId)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (!product) return { db, product: null, error: "Product not found.", status: 404 as const };

  const { count } = await db
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  return { db, product, variantCount: count || 0 };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { productId } = await context.params;
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required." }, { status: 400 });
  }

  const loaded = await loadOwnedProduct(storeId, productId, auth.vendorId);
  if (!loaded.product) {
    return NextResponse.json({ error: loaded.error || "Product not found." }, { status: loaded.status || 404 });
  }

  const product = loaded.product;
  return NextResponse.json({
    product: {
      id: product.id,
      name: product.name,
      description: product.description || "",
      images: asImages(product.images),
      price: Number(product.price || 0),
      currency: product.currency || "USD",
      sku: product.sku,
      slug: product.slug,
      variantCount: loaded.variantCount,
    },
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { productId } = await context.params;
  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    name?: string;
    description?: string;
    images?: unknown;
    price?: number | null;
  } | null;
  if (!body?.storeId) {
    return NextResponse.json({ error: "storeId is required." }, { status: 400 });
  }

  const loaded = await loadOwnedProduct(body.storeId, productId, auth.vendorId);
  if (!loaded.product) {
    return NextResponse.json({ error: loaded.error || "Product not found." }, { status: loaded.status || 404 });
  }

  const images = Array.isArray(body.images)
    ? body.images.filter((item): item is string => typeof item === "string")
    : asImages(loaded.product.images);

  const update = buildStoreProductUpdate({
    name: typeof body.name === "string" ? body.name : loaded.product.name,
    description:
      typeof body.description === "string"
        ? body.description
        : loaded.product.description || "",
    images,
    price: body.price === undefined ? Number(loaded.product.price || 0) : body.price,
    variantCount: loaded.variantCount,
    currentPrice: Number(loaded.product.price || 0),
  });
  if (!update.ok) {
    return NextResponse.json({ error: update.error }, { status: 400 });
  }

  const { data, error } = await loaded.db
    .from("products")
    .update(update.patch)
    .eq("id", productId)
    .eq("vendor_id", auth.vendorId)
    .select("id, name, description, images, price, currency, sku, updated_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Could not save product." },
      { status: 500 },
    );
  }

  if (update.patch.price !== undefined && loaded.variantCount === 1) {
    const { error: variantError } = await loaded.db
      .from("product_variants")
      .update({ price: update.patch.price, updated_at: update.patch.updated_at })
      .eq("product_id", productId);
    if (variantError) {
      return NextResponse.json(
        { error: variantError.message || "Could not save the variant price." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    saved: true,
    product: {
      id: data.id,
      name: data.name,
      description: data.description || "",
      images: asImages(data.images),
      price: Number(data.price || 0),
      currency: data.currency || "USD",
      sku: data.sku,
      updatedAt: data.updated_at,
    },
  });
}
