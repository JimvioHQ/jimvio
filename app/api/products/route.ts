import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { slugify } from "@/lib/utils";

const createProductSchema = z.object({
  name: z.string().min(3).max(200),
  short_description: z.string().max(500).optional(),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  product_type: z.enum(["physical", "digital", "subscription", "course", "software", "template", "ebook"]),
  price: z.number().positive(),
  compare_at_price: z.number().positive().optional(),
  images: z.array(z.string()).default([]),
  inventory_quantity: z.number().int().min(0).default(0),
  track_inventory: z.boolean().default(true),
  is_digital: z.boolean().default(false),
  digital_file_url: z.string().url().optional(),
  affiliate_enabled: z.boolean().default(true),
  affiliate_commission_rate: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 100);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const search = searchParams.get("q");
    const sort = searchParams.get("sort") || "trending";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("products")
      .select(`
        id, name, slug, short_description, price, compare_at_price,
        images, rating, review_count, is_featured, is_digital,
        affiliate_enabled, affiliate_commission_rate, sale_count, view_count,
        vendors!inner(id, business_name, business_slug, rating, verification_status),
        product_categories(name, slug)
      `, { count: "exact" })
      .eq("status", "active")
      .eq("is_active", true);

    if (category) query = query.eq("product_categories.slug", category);
    if (type) query = query.eq("product_type", type);
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

    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!vendor) return NextResponse.json({ error: "Vendor account required" }, { status: 403 });

    const body = await req.json();
    const productData = createProductSchema.parse(body);

    let slug = slugify(productData.name);
    const { data: existingSlug } = await supabase.from("products").select("id").eq("slug", slug).single();
    if (existingSlug) slug = `${slug}-${Date.now()}`;

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        ...productData,
        vendor_id: vendor.id,
        slug,
        status: "draft",
        currency: "RWF",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid product data", details: error.errors }, { status: 400 });
    }
    console.error("Product create error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
