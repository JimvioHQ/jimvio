export type SliceCollection = {
  id: string;
  title: string;
  handle: string;
  image_url?: string | null;
  description?: string | null;
  product_count?: number | null;
};

export function sliceCollectionsForSection(
  all: SliceCollection[],
  props: Record<string, unknown> | undefined
): SliceCollection[] {
  const limit = Math.min(Math.max(Number(props?.limit) || 12, 1), 24);
  const rawIds = props?.collectionIds;
  const collectionIds = Array.isArray(rawIds)
    ? rawIds.filter((id): id is string => typeof id === "string" && !!id)
    : [];
  if (collectionIds.length) {
    const byId = new Map(all.map((c) => [c.id, c]));
    const picked: SliceCollection[] = [];
    for (const id of collectionIds) {
      const c = byId.get(id);
      if (c) picked.push(c);
    }
    return picked.slice(0, limit);
  }
  return all.slice(0, limit);
}

export function categoryNavTiles(collections: SliceCollection[]): Array<
  SliceCollection & { id: string }
> {
  return [
    {
      id: "all",
      title: "All",
      handle: "all",
      image_url: null,
    },
    ...collections,
  ];
}
