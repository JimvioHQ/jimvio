import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { globalSearch } from "@/lib/discovery/search";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Enhanced suggestions — products/vendors/categories plus communities/creators/courses/live.
 * Keeps legacy response keys for existing clients.
 */
export async function GET(req: NextRequest) {
  const term = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (term.length < 2) {
    return NextResponse.json({
      products: [],
      vendors: [],
      categories: [],
      communities: [],
      creators: [],
      courses: [],
      lives: [],
      campaigns: [],
      hits: [],
    });
  }

  const limited = rateLimit(
    `search-suggestions:${req.headers.get("x-forwarded-for") ?? "anon"}`,
    90,
    60_000
  );
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [legacy, unified] = await Promise.all([
      // Keep legacy category suggestions
      (async () => {
        const { data } = await supabase
          .from("product_categories")
          .select("id, name, slug")
          .eq("is_active", true)
          .ilike("name", `%${term.replace(/[%_\\]/g, "")}%`)
          .order("sort_order", { ascending: true })
          .limit(6);
        return data ?? [];
      })(),
      globalSearch({
        q: term,
        limit: 24,
        userId: user?.id ?? null,
        types: ["product", "creator", "community", "course", "live", "campaign", "digital"],
      }),
    ]);

    const products = unified.items
      .filter((h) => h.entityType === "product" || h.entityType === "digital")
      .slice(0, 8)
      .map((h) => ({
        id: h.id,
        name: h.title,
        slug: h.href.split("/").pop() ?? h.id,
        image: h.imageUrl,
      }));

    const vendors = unified.items
      .filter((h) => h.entityType === "creator" && h.meta?.kind === "vendor")
      .slice(0, 6)
      .map((h) => ({
        id: h.id.replace(/^vendor-/, ""),
        business_name: h.title,
        business_slug: h.href.split("/").pop() ?? h.id,
      }));

    return NextResponse.json({
      products,
      vendors,
      categories: legacy,
      communities: unified.items
        .filter((h) => h.entityType === "community")
        .slice(0, 6)
        .map((h) => ({ id: h.id, name: h.title, slug: h.href.split("/").pop(), avatar_url: h.imageUrl, tagline: h.subtitle })),
      creators: unified.items
        .filter((h) => h.entityType === "creator")
        .slice(0, 6)
        .map((h) => ({ id: h.id, name: h.title, href: h.href, image: h.imageUrl })),
      courses: unified.items
        .filter((h) => h.entityType === "course")
        .slice(0, 6)
        .map((h) => ({ id: h.id, title: h.title, href: h.href, image: h.imageUrl })),
      lives: unified.items
        .filter((h) => h.entityType === "live")
        .slice(0, 6)
        .map((h) => ({ id: h.id, title: h.title, href: h.href })),
      campaigns: unified.items
        .filter((h) => h.entityType === "campaign")
        .slice(0, 6)
        .map((h) => ({ id: h.id, title: h.title, href: h.href })),
      hits: unified.items,
    });
  } catch (e) {
    console.error("GET /api/search/suggestions:", e);
    return NextResponse.json({
      products: [],
      vendors: [],
      categories: [],
      communities: [],
      creators: [],
      courses: [],
      lives: [],
      campaigns: [],
      hits: [],
    });
  }
}
