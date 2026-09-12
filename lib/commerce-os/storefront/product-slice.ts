import type { ThemeSection } from "../themes/registry";

export type SliceProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | string | null;
  compare_at_price?: number | string | null;
  currency?: string | null;
  images?: unknown;
  short_description?: string | null;
};

function sortForSection(
  type: string,
  props: Record<string, unknown>
): "manual" | "newest" | "price_asc" | "price_desc" {
  const explicit = props.sort;
  if (
    explicit === "manual" ||
    explicit === "newest" ||
    explicit === "price_asc" ||
    explicit === "price_desc"
  ) {
    return explicit;
  }
  if (type === "new_arrivals") return "newest";
  if (type === "best_sellers") return "manual";
  return "manual";
}

export function sliceProductsForSection(
  all: SliceProduct[],
  section: ThemeSection
): SliceProduct[] {
  const props = section.props || {};
  const limit = Math.min(
    Math.max(Number(props.limit) || (section.type === "collections" ? 6 : 8), 1),
    24
  );

  const rawIds = props.productIds;
  const productIds = Array.isArray(rawIds)
    ? rawIds.filter((id): id is string => typeof id === "string" && !!id)
    : [];

  if (productIds.length) {
    const byId = new Map(all.map((p) => [p.id, p]));
    const picked: SliceProduct[] = [];
    for (const id of productIds) {
      const p = byId.get(id);
      if (p) picked.push(p);
    }
    return picked.slice(0, limit);
  }

  const sort = sortForSection(section.type, props);
  const list = [...all];
  if (sort === "price_asc") {
    list.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
  } else if (sort === "price_desc") {
    list.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
  }
  return list.slice(0, limit);
}
