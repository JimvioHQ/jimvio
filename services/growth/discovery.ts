import { getAdminDB } from "@/services/base";

export type DiscoveryItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  href: string;
};

export type DiscoveryShelves = {
  creators: DiscoveryItem[];
  communities: DiscoveryItem[];
  products: DiscoveryItem[];
  lives: DiscoveryItem[];
};

const emptyShelves = (): DiscoveryShelves => ({
  creators: [],
  communities: [],
  products: [],
  lives: [],
});

/** Best-effort discovery backed only by existing platform tables. */
export async function getDiscoveryShelves(): Promise<DiscoveryShelves> {
  const db = getAdminDB() as any;
  const shelves = emptyShelves();

  const [creators, communities, products, lives] = await Promise.allSettled([
    db
      .from("influencers")
      .select("id, user_id, display_name, bio, profile_image, total_followers")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("total_followers", { ascending: false })
      .limit(6),
    db
      .from("communities")
      .select("id, name, slug, tagline, avatar_url, member_count")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("member_count", { ascending: false })
      .limit(6),
    db
      .from("products")
      .select("id, name, slug, short_description, images, sale_count")
      .eq("status", "active")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("sale_count", { ascending: false })
      .limit(6),
    db
      .from("live_sessions")
      .select("id, title, description, settings, status, scheduled_at, created_at")
      .in("status", ["live", "scheduled"])
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(6),
  ]);

  if (creators.status === "fulfilled" && !creators.value.error) {
    shelves.creators = (creators.value.data ?? []).map((creator: any) => ({
      id: creator.id,
      title: creator.display_name,
      subtitle: creator.bio ?? (creator.total_followers ? `${creator.total_followers} followers` : null),
      imageUrl: creator.profile_image,
      href: `/influencers/u/${creator.user_id}`,
    }));
  }
  if (communities.status === "fulfilled" && !communities.value.error) {
    shelves.communities = (communities.value.data ?? []).map((community: any) => ({
      id: community.id,
      title: community.name,
      subtitle: community.tagline ?? `${community.member_count ?? 0} members`,
      imageUrl: community.avatar_url,
      href: `/communities/${community.slug}`,
    }));
  }
  if (products.status === "fulfilled" && !products.value.error) {
    shelves.products = (products.value.data ?? []).map((product: any) => ({
      id: product.id,
      title: product.name,
      subtitle: product.short_description ?? `${product.sale_count ?? 0} sold`,
      imageUrl: imageUrl(product.images),
      href: `/marketplace/${product.slug}`,
    }));
  }
  if (lives.status === "fulfilled" && !lives.value.error) {
    shelves.lives = (lives.value.data ?? []).map((live: any) => ({
      id: live.id,
      title: live.title ?? "Live session",
      subtitle: live.description ?? (live.status === "live" ? "Live now" : "Upcoming live"),
      imageUrl: typeof live.settings?.thumbnail_url === "string" ? live.settings.thumbnail_url : null,
      href: `/communities/live/${live.id}`,
    }));
  }

  return shelves;
}

function imageUrl(images: unknown): string | null {
  if (Array.isArray(images)) {
    const first = images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first && typeof (first as any).url === "string") {
      return (first as any).url;
    }
  }
  return null;
}
