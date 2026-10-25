import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { slugify } from "@/lib/utils";
import {
  assertCanCreateProductType,
  initialStatusForVendorSubmit,
  type VendorAuthSnapshot,
} from "@/lib/products/authorization";
import { ensureSellerVendor } from "@/lib/actions/seller-products";

const createProductSchema = z.object({
  name: z.string().min(3).max(200),
  short_description: z.string().max(500).optional(),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  product_type: z.enum(["physical", "digital"]),
  price: z.number().positive(),
  compare_at_price: z.number().positive().optional(),
  images: z.array(z.string()).default([]),
  inventory_quantity: z.number().int().min(0).default(0),
  track_inventory: z.boolean().default(true),
  digital_file_url: z.string().url().optional().nullable(),
  acquisition_model: z.enum([
    "original_vendor_product",
    "licensed_resale_product",
    "distribution_partner_product",
    "affiliate_only_product",
  ]).optional(),
  affiliate_destination_url: z.string().url().optional().nullable(),
  rightsholder_name: z.string().max(200).optional().nullable(),
  declarations_accepted: z.boolean().optional(),
  file_name: z.string().max(200).optional().nullable(),
  file_mime: z.string().max(120).optional().nullable(),
  file_size_bytes: z.number().int().nonnegative().optional().nullable(),
  evidence_url: z.string().url().optional().nullable(),
  affiliate_enabled: z.boolean().default(true),
  affiliate_commission_rate: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  currency: z.string().default("USD"),
  intent: z.enum(["draft", "submit"]).default("submit"),
}).refine(
  (d) => {
    if (d.product_type !== "digital" || d.intent === "draft") return true;
    if (d.acquisition_model === "affiliate_only_product") return Boolean(d.affiliate_destination_url);
    return Boolean(d.digital_file_url);
  },
  { message: "A private file or an affiliate destination is required", path: ["digital_file_url"] }
);

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 100);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const source = searchParams.get("source");
    const search = searchParams.get("q");
    const sort = searchParams.get("sort") || "trending";
    const offset = (page - 1) * limit;

    const validProductTypes = [
      "template", "community", "course", "physical", "digital",
      "subscription", "software", "ebook", "coaching", "bundle"
    ] as const;
    const isValidType = type && validProductTypes.includes(type as any);


    let query = supabase
      .from("products")
      .select(`
        id, name, slug, short_description, price, currency, compare_at_price,
        images, rating, review_count, is_featured, is_digital, source,
        affiliate_enabled, affiliate_commission_rate, sale_count, view_count,
        vendors!inner(id, business_name, business_slug, rating, verification_status),
        product_categories(name, slug)
      `, { count: "exact" })
      .eq("status", "active")
      .eq("is_active", true);

    if (category) query = query.eq("product_categories.slug", category);
    if (isValidType) query = query.eq("product_type", type as typeof validProductTypes[number]);
    if (source) query = query.eq("source", source);
    if (search) query = query.textSearch("name", search);

    switch (sort) {
      case "newest": query = query.order("created_at", { ascending: false }); break;
      case "price-asc": query = query.order("price", { ascending: true }); break;
      case "price-desc": query = query.order("price", { ascending: false }); break;
      case "rating": query = query.order("rating", { ascending: false }); break;
      case "sales": query = query.order("sale_count", { ascending: false }); break;
      default: query = query.order("view_count", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: products, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const vendor = await ensureSellerVendor(user.id);
    const body = await req.json();
    const productData = createProductSchema.parse(body);

    const auth = assertCanCreateProductType(
      user.id,
      vendor as VendorAuthSnapshot | null,
      productData.product_type,
    );
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.message, code: auth.code },
        { status: auth.code === "business_verification_required" ? 403 : 403 },
      );
    }

    const isDigital = productData.product_type === "digital";
    if (isDigital) {
      const { verificationSchemaReady } = await import("@/lib/digital-products/trust/service");
      if (!(await verificationSchemaReady())) {
        return NextResponse.json(
          { error: "Digital listings cannot be created until verification storage is available. Apply migration 168." },
          { status: 503 },
        );
      }
    }
    const derivedFields = {
      is_digital: isDigital,
      requires_shipping: !isDigital,
      inventory_quantity: isDigital ? 0 : productData.inventory_quantity,
      track_inventory: isDigital ? false : productData.track_inventory,
      digital_file_url: isDigital ? (productData.digital_file_url ?? null) : null,
    };

    let slug = slugify(productData.name);
    const { data: existingSlug } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
    if (existingSlug) slug = `${slug}-${Date.now()}`;

    const status = initialStatusForVendorSubmit(productData.intent);
    const rest = {
      name: productData.name,
      short_description: productData.short_description,
      description: productData.description,
      category_id: productData.category_id,
      product_type: productData.product_type,
      price: productData.price,
      compare_at_price: productData.compare_at_price,
      images: productData.images,
      affiliate_enabled: productData.affiliate_enabled,
      affiliate_commission_rate: productData.affiliate_commission_rate,
      tags: productData.tags,
      currency: productData.currency,
    };

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        ...rest,
        ...derivedFields,
        vendor_id: auth.vendor.id,
        slug,
        status,
        is_active: true,
        source: "vendor",
        source_metadata: {},
        published_at: null,
        submitted_for_review_at: productData.intent === "submit" ? new Date().toISOString() : null,
      } as never)
      .select()
      .single();

    if (error) throw error;

    if (isDigital && product?.id) {
      const { verificationSchemaReady, engageProductVerification } = await import("@/lib/digital-products/trust/service");
      if (await verificationSchemaReady()) {
        const recorded = await engageProductVerification({
          productId: product.id,
          vendorId: auth.vendor.id,
          actorUserId: user.id,
          submission: {
            intent: productData.intent,
            name: productData.name,
            description: productData.description ?? null,
            categoryId: productData.category_id ?? null,
            acquisitionModel: productData.acquisition_model ?? "original_vendor_product",
            fulfillmentMode: productData.acquisition_model === "affiliate_only_product" ? "affiliate_redirect" : "download",
            affiliateDestinationUrl: productData.affiliate_destination_url ?? null,
            rightsholderName: productData.rightsholder_name ?? null,
            buyerLicenseSummary: null,
            declarationsAccepted: Boolean(productData.declarations_accepted),
            fileName: productData.file_name ?? null,
            fileMime: productData.file_mime ?? null,
            fileSizeBytes: productData.file_size_bytes ?? null,
            fileUrl: productData.digital_file_url ?? null,
            evidenceUrl: productData.evidence_url ?? null,
            evidenceFileName: null,
            duplicateDigest: false,
          },
        });
        if (!recorded.ok && productData.intent === "submit") {
          return NextResponse.json({ error: recorded.error, id: product.id }, { status: 422 });
        }
      }
    }

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid product data", details: error.errors }, { status: 400 });
    }
    console.error("Product create error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
