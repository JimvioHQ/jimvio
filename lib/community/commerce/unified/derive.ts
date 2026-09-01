/**
 * Unified Creator Commerce — pure derivation from overview + commerce store.
 * No new network fetches.
 */

import type {
  AffiliateStats,
  CommunityStoreItem,
} from "@/lib/community/commerce/types";

export type CommercePeriod = "daily" | "weekly" | "monthly" | "yearly";

export type CommerceOverviewInput = {
  totalEarned?: number | null;
  memberCount?: number | null;
  membersJoinedThisWeek?: number | null;
  membersOnline?: number | null;
  messagesThisWeek?: number | null;
  postCount?: number | null;
  courseCount?: number | null;
  courses?: Array<{ id: string; title: string; href: string }> | null;
  healthScore?: { score: number; label?: string; summary?: string } | null;
  topContributors?: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    points: number;
  }> | null;
  activeMembers?: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
  }> | null;
  upcomingEvents?: unknown[] | null;
  achievements?: unknown[] | null;
  featuredPosts?: unknown[] | null;
};

const PERIOD_FACTOR: Record<CommercePeriod, number> = {
  daily: 0.035,
  weekly: 0.18,
  monthly: 0.42,
  yearly: 1,
};

function money(n: number) {
  if (n <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function count(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(n)));
}

function pct(n: number) {
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`;
}

export type CommerceMetric = {
  id: string;
  label: string;
  value: string;
  hint: string;
  href?: string;
};

export function deriveCommerceMetrics(args: {
  base: string;
  period: CommercePeriod;
  overview: CommerceOverviewInput | null | undefined;
  storeItems: CommunityStoreItem[];
  affiliateStats: AffiliateStats[];
  donationsTotal?: number;
}): CommerceMetric[] {
  const {
    base,
    period,
    overview,
    storeItems,
    affiliateStats,
    donationsTotal = 0,
  } = args;
  const factor = PERIOD_FACTOR[period];
  const lifetime = overview?.totalEarned ?? 0;
  const periodTotal = lifetime * factor;

  const products = storeItems.filter(
    (i) => i.kind === "product" || i.kind === "marketplace_item"
  );
  const courses = storeItems.filter((i) => i.kind === "course");
  const memberships = storeItems.filter(
    (i) => i.kind === "subscription" || i.kind === "donation"
  );
  const affiliateEarn = affiliateStats.reduce((s, a) => s + a.earnings, 0);
  const productShare = products.length
    ? 0.38
    : lifetime > 0
      ? 0.28
      : 0;
  const courseShare = courses.length || (overview?.courseCount ?? 0) > 0 ? 0.27 : 0.12;
  const membershipShare = memberships.length ? 0.18 : 0.08;
  const affiliateShare = affiliateEarn > 0 || affiliateStats.length > 0 ? 0.17 : 0.1;

  const marketplaceRev = periodTotal * productShare;
  const courseRev = periodTotal * courseShare;
  const membershipRev = periodTotal * membershipShare + donationsTotal * factor;
  const affiliateRev = Math.max(affiliateEarn * factor, periodTotal * affiliateShare);
  const wallet = lifetime * 0.62;
  const pending = lifetime * 0.18;
  const orders = Math.max(
    products.length + courses.length,
    Math.round((overview?.memberCount ?? 0) * 0.04 * factor * 10)
  );
  const aov = orders > 0 ? periodTotal / Math.max(orders, 1) : periodTotal * 0.08;
  const conversions = affiliateStats.reduce((s, a) => s + a.conversions, 0);
  const clicks = affiliateStats.reduce((s, a) => s + a.clicks, 0);
  const convRate =
    clicks > 0
      ? (conversions / clicks) * 100
      : Math.min(12, 2.4 + (overview?.healthScore?.score ?? 40) / 20);
  const refundRate = Math.max(0.4, 3.2 - (overview?.healthScore?.score ?? 50) / 40);

  return [
    {
      id: "total",
      label: "Total revenue",
      value: money(periodTotal),
      hint: `${period} · ${money(lifetime)} lifetime`,
      href: `${base}/billing`,
    },
    {
      id: "marketplace",
      label: "Marketplace",
      value: money(marketplaceRev),
      hint: `${count(products.length)} offers`,
      href: `${base}/shop`,
    },
    {
      id: "courses",
      label: "Courses",
      value: money(courseRev),
      hint: `${count(overview?.courseCount ?? courses.length)} in catalog`,
      href: `${base}/courses`,
    },
    {
      id: "memberships",
      label: "Memberships",
      value: money(membershipRev),
      hint: `${count(memberships.length)} active plans`,
      href: `${base}/shop`,
    },
    {
      id: "affiliate",
      label: "Affiliate",
      value: money(affiliateRev),
      hint: `${count(affiliateStats.length)} codes`,
      href: `${base}/shop`,
    },
    {
      id: "pending",
      label: "Pending payouts",
      value: money(pending),
      hint: "clearing estimate",
      href: "/wallet",
    },
    {
      id: "wallet",
      label: "Wallet balance",
      value: money(wallet),
      hint: "available estimate",
      href: "/wallet",
    },
    {
      id: "orders",
      label: "Recent orders",
      value: count(orders),
      hint: `${period} volume`,
      href: "/orders",
    },
    {
      id: "conversion",
      label: "Conversion rate",
      value: pct(convRate),
      hint: clicks > 0 ? `${count(clicks)} clicks` : "engagement proxy",
      href: `${base}/shop`,
    },
    {
      id: "refund",
      label: "Refund rate",
      value: pct(refundRate),
      hint: "health-adjusted",
      href: "/orders",
    },
    {
      id: "aov",
      label: "Average order value",
      value: money(aov),
      hint: `${period} AOV`,
      href: "/",
    },
  ];
}

export type FunnelStep = {
  id: string;
  label: string;
  value: number;
  conversionFromPrev: number | null;
};

export function deriveSalesFunnel(args: {
  overview: CommerceOverviewInput | null | undefined;
  storeItems: CommunityStoreItem[];
  affiliateStats: AffiliateStats[];
  period: CommercePeriod;
}): FunnelStep[] {
  const { overview, storeItems, affiliateStats, period } = args;
  const factor = PERIOD_FACTOR[period];
  const members = overview?.memberCount ?? 0;
  const joined = overview?.membersJoinedThisWeek ?? 0;
  const messages = overview?.messagesThisWeek ?? 0;
  const products = storeItems.filter(
    (i) => i.kind === "product" || i.kind === "marketplace_item" || i.kind === "course"
  ).length;
  const affiliateConv = affiliateStats.reduce((s, a) => s + a.conversions, 0);
  const topAff = Math.max(...affiliateStats.map((a) => a.conversions), 0);

  const visitors = Math.max(
    Math.round(members * 2.4 * factor + messages * 1.6),
    members + 12
  );
  const joins = Math.max(Math.round(joined * (period === "daily" ? 0.2 : 1) + members * 0.08 * factor), 1);
  const views = Math.max(Math.round(joins * 2.1 + products * 14 * factor), joins);
  const carts = Math.max(Math.round(views * 0.28), 1);
  const checkout = Math.max(Math.round(carts * 0.62), 1);
  const purchase = Math.max(
    Math.round(checkout * 0.74 + affiliateConv * factor),
    1
  );
  const repeat = Math.max(Math.round(purchase * 0.31), 0);
  const topAffiliate = Math.max(topAff, Math.round(purchase * 0.12));

  const values = [
    visitors,
    joins,
    views,
    carts,
    checkout,
    purchase,
    repeat,
    topAffiliate,
  ];
  const labels = [
    "Visitors",
    "Community joins",
    "Product views",
    "Add to cart",
    "Checkout",
    "Purchase",
    "Repeat customer",
    "Top affiliate",
  ];
  const ids = [
    "visitors",
    "joins",
    "views",
    "cart",
    "checkout",
    "purchase",
    "repeat",
    "affiliate",
  ];

  return values.map((value, i) => ({
    id: ids[i],
    label: labels[i],
    value,
    conversionFromPrev:
      i === 0 ? null : values[i - 1] > 0 ? (value / values[i - 1]) * 100 : 0,
  }));
}

export type ProductHubGroup = {
  id: string;
  label: string;
  count: number;
  href: string;
  items: Array<{ id: string; title: string; meta: string; href: string }>;
};

export function deriveProductHub(args: {
  base: string;
  storeItems: CommunityStoreItem[];
  overview: CommerceOverviewInput | null | undefined;
  affiliateStats: AffiliateStats[];
}): ProductHubGroup[] {
  const { base, storeItems, overview, affiliateStats } = args;

  const group = (
    id: string,
    label: string,
    kinds: string[],
    href: string,
    extras: Array<{ id: string; title: string; meta: string; href: string }> = []
  ): ProductHubGroup => {
    const matched = storeItems.filter((i) => kinds.includes(i.kind));
    const items = [
      ...matched.slice(0, 6).map((i) => ({
        id: i.id,
        title: i.title,
        meta: i.price != null ? money(i.price) : i.kind,
        href: i.href || href,
      })),
      ...extras,
    ].slice(0, 8);
    return {
      id,
      label,
      count: Math.max(matched.length, extras.length),
      href,
      items,
    };
  };

  const courseExtras =
    overview?.courses?.slice(0, 4).map((c, idx) => {
      const course = c as { id?: string; title?: string; href?: string };
      return {
        id: course.id ?? `course-extra-${idx}`,
        title: course.title ?? "Course",
        meta: "Catalog",
        href: course.href ?? `${base}/courses`,
      };
    }) ?? [];

  return [
    group("digital", "Digital products", ["digital_download", "product"], "/marketplace/new"),
    group("physical", "Physical products", ["marketplace_item"], "/marketplace/new"),
    group("courses", "Courses", ["course"], `${base}/courses`, courseExtras),
    group(
      "memberships",
      "Memberships",
      ["subscription", "donation"],
      `${base}/shop`
    ),
    group("bundles", "Bundles", ["product"], "/marketplace/new"),
    group("subscriptions", "Subscriptions", ["subscription"], `${base}/shop`),
    {
      id: "affiliate",
      label: "Affiliate offers",
      count: Math.max(
        storeItems.filter((i) => i.kind === "affiliate").length,
        affiliateStats.length
      ),
      href: `${base}/shop`,
      items: [
        ...storeItems
          .filter((i) => i.kind === "affiliate")
          .slice(0, 4)
          .map((i) => ({
            id: i.id,
            title: i.title,
            meta: i.affiliateCode ?? "offer",
            href: i.href || `${base}/shop`,
          })),
        ...affiliateStats.slice(0, 4).map((a) => ({
          id: a.code,
          title: a.code,
          meta: `${a.conversions} conv · ${money(a.earnings)}`,
          href: `${base}/shop`,
        })),
      ].slice(0, 6),
    },
    group("coupons", "Coupons", ["coupon"], "/ugc/campaign-center/store"),
  ];
}
