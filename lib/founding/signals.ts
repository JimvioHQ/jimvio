import { getAdminDB } from "@/services/db";

/**
 * What a Founding Creator applicant has actually done on Jimvio.
 * Shown to the reviewer next to the application — read from real rows only.
 */
export type ActivitySignals = {
  memberSince: string | null;
  communities: number;
  creatorProfile: boolean;
  liveProducts: number;
  posts: number;
  ugcSubmissions: number;
  affiliateLinks: number;
  feedback: number;
};

type Db = {
  from: (t: string) => {
    select: (c: string, o?: { count: "exact"; head: true }) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
};

async function count(q: PromiseLike<{ count: number | null }>): Promise<number> {
  try {
    const { count: n } = await q;
    return n ?? 0;
  } catch {
    return 0;
  }
}

export async function loadActivitySignals(userId: string): Promise<ActivitySignals> {
  const db = getAdminDB() as unknown as Db;
  const head = { count: "exact" as const, head: true as const };

  const [{ data: profile }, { data: influencer }, { data: vendor }, { data: affiliate }] = await Promise.all([
    db.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
    db.from("influencers").select("id, display_name").eq("user_id", userId).maybeSingle(),
    db.from("vendors").select("id").eq("user_id", userId).maybeSingle(),
    db.from("affiliates").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  const [communities, liveProducts, posts, ugcSubmissions, affiliateLinks, feedback] = await Promise.all([
    count(db.from("communities").select("id", head).eq("owner_id", userId).eq("is_active", true).is("archived_at", null)),
    vendor?.id
      ? count(
          db.from("products").select("id", head).eq("vendor_id", vendor.id).eq("status", "active").eq("is_active", true).is("deleted_at", null),
        )
      : Promise.resolve(0),
    count(db.from("community_posts").select("id", head).eq("author_id", userId)),
    influencer?.id ? count(db.from("ugc_submissions").select("id", head).eq("influencer_id", influencer.id)) : Promise.resolve(0),
    affiliate?.id ? count(db.from("affiliate_links").select("id", head).eq("affiliate_id", affiliate.id)) : Promise.resolve(0),
    count(db.from("product_feedback").select("id", head).eq("user_id", userId)),
  ]);

  return {
    memberSince: profile?.created_at ?? null,
    communities,
    creatorProfile: Boolean(influencer?.display_name?.trim()),
    liveProducts,
    posts,
    ugcSubmissions,
    affiliateLinks,
    feedback,
  };
}
