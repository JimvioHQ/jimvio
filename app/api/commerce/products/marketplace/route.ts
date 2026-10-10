import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
  importMarketplaceProductToStore,
} from "@/lib/commerce-os";
import { marketplaceImportBlockReason } from "@/lib/commerce-os/product-editor";

export const dynamic = "force-dynamic";

function asImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function GET(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required." }, { status: 400 });
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  let query = db
    .from("products")
    .select(
      "id, name, price, currency, images, status, source, cost_price, short_description, shopify_product_id, updated_at",
    )
    .eq("vendor_id", auth.vendorId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(48);

  if (q) {
    query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  }

  const [{ data: products, error }, { data: links }] = await Promise.all([
    query,
    cosTable(db, "jimvio_store_products")
      .select("product_id")
      .eq("store_id", storeId)
      .eq("vendor_id", auth.vendorId),
  ]);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not load marketplace products." },
      { status: 500 },
    );
  }

  const linked = new Set((links ?? []).map((row) => row.product_id).filter(Boolean));
  const eligible = (products ?? []).flatMap((product) => {
    const blocked = marketplaceImportBlockReason({
      productVendorId: auth.vendorId,
      merchantVendorId: auth.vendorId,
      source: product.shopify_product_id ? "shopify" : product.source,
      status: product.status,
      alreadyLinked: false,
    });
    if (blocked && blocked.code !== "ALREADY_IMPORTED") return [];
    const images = asImages(product.images);
    return [
      {
        id: product.id,
        name: product.name,
        price: Number(product.price || 0),
        currency: product.currency || "USD",
        sourcePrice: product.cost_price == null ? null : Number(product.cost_price),
        image: images[0] || null,
        summary: product.short_description,
        alreadyImported: linked.has(product.id),
      },
    ];
  });

  return NextResponse.json({ products: eligible });
}

export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    productId?: string;
  } | null;
  if (!body?.storeId || !body.productId) {
    return NextResponse.json({ error: "storeId and productId are required." }, { status: 400 });
  }

  const db = cosAdminDb();
  const result = await importMarketplaceProductToStore(db, {
    vendorId: auth.vendorId,
    storeId: body.storeId,
    productId: body.productId,
    publish: true,
  });

  if (!result.ok) {
    const status =
      result.code === "ALREADY_IMPORTED"
        ? 409
        : result.code === "STORE_NOT_FOUND" || result.code === "PRODUCT_NOT_FOUND"
          ? 404
          : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json(
    { storeProductId: result.storeProductId, productId: result.productId },
    { status: 201 },
  );
}
