import type { CreatorProfilePayload } from "@/lib/creator-profile/types";
import type { CommunityDetailPayload } from "@/components/community/community-detail-view";
import {
  BUSINESS_COLLABORATION_META,
  BUSINESS_DISCOVERY_META,
  BUSINESS_RELATION_META,
} from "./config";
import { assembleBusinessGraph, businessNode, businessSection } from "./build";
import type { BusinessGraphPayload, BusinessSearchKind } from "./types";
import { normalizeImages } from "@/lib/utils";

export type ProductBusinessGraphInput = {
  product: { id: string; name: string; slug?: string | null; images?: unknown };
  vendor?: {
    id?: string;
    business_name?: string | null;
    business_slug?: string | null;
    business_logo?: string | null;
  } | null;
  relatedProducts?: Array<{ id: string; name: string; slug?: string | null; images?: unknown }>;
};

function productHref(slug?: string | null) {
  return slug ? `/marketplace/${slug}` : "/marketplace";
}

function firstImage(images: unknown): string | null {
  return normalizeImages(images)[0] ?? null;
}

export function buildCreatorBusinessGraph(payload: CreatorProfilePayload): BusinessGraphPayload {
  const { identity, stats } = payload.profile;
  const title = identity.displayName;
  const slug = identity.slug;

  const sold = payload.products.slice(0, 8).map((p) =>
    businessNode(
      {
        id: `sold-${p.id}`,
        kind: "product",
        title: p.name,
        subtitle: `$${p.price}`,
        href: productHref(p.slug),
        imageUrl: firstImage(p.images),
        badge: "Sold",
      },
      title,
    ),
  );

  const promoted = payload.affiliateCampaigns.slice(0, 6).map((c) =>
    businessNode(
      {
        id: `promo-${c.id}`,
        kind: "affiliate-program",
        title: c.title,
        subtitle: c.rateLabel,
        href: c.href,
        badge: "Promoted",
      },
      title,
    ),
  );

  const affiliates = payload.affiliateCampaigns.map((c) =>
    businessNode(
      { id: `aff-${c.id}`, kind: "affiliate-program", title: c.title, href: c.href, badge: "Affiliate" },
      title,
    ),
  );

  const communities = payload.communities.map((c) =>
    businessNode(
      {
        id: `comm-${c.id}`,
        kind: "community",
        title: c.name,
        subtitle: `${c.memberCount} ${c.memberCount === 1 ? "member" : "members"}`,
        href: `/communities/${c.slug}`,
        imageUrl: c.avatarImage ?? c.coverImage ?? null,
      },
      title,
    ),
  );

  const courses = payload.courses.map((c) =>
    businessNode(
      {
        id: `course-${c.id}`,
        kind: "course",
        title: c.title,
        subtitle: `${c.students} students`,
        href: productHref(c.slug),
        imageUrl: c.image ?? null,
      },
      title,
    ),
  );

  const ugc = payload.ugcCampaigns.map((c) =>
    businessNode(
      { id: `ugc-${c.id}`, kind: "ugc-campaign", title: c.title, href: c.href, badge: "UGC" },
      title,
    ),
  );

  const brandCollabs = [
    businessNode(
      {
        id: `brand-${identity.id}`,
        kind: "brand",
        title: `${title} × Brand collab`,
        subtitle: "Partnership opportunity",
        href: `/influencers/${slug}`,
        badge: "Brand",
      },
      title,
    ),
  ];

  const followers = [
    businessNode(
      {
        id: `followers-${identity.id}`,
        kind: "buyer",
        title: `${stats.followers.toLocaleString()} followers`,
        subtitle: "Business audience",
        href: `/influencers/${slug}`,
      },
      title,
    ),
  ];

  const reputation = [
    businessNode(
      {
        id: `rep-${identity.id}`,
        kind: "seller",
        title: `${stats.rating}★ · ${stats.reviewCount} reviews`,
        subtitle: "Business reputation",
        href: `/influencers/${slug}`,
        badge: identity.level,
      },
      title,
    ),
  ];

  const scaffoldDiscovery = (id: keyof typeof BUSINESS_DISCOVERY_META, kind: BusinessGraphPayload["discoverySections"][0]["nodes"][0]["kind"], label: string) =>
    businessSection(id, BUSINESS_DISCOVERY_META[id].title, [
      businessNode({ id: `disc-${id}`, kind, title: label, href: "/", badge: "Suggested" }, title),
    ], BUSINESS_DISCOVERY_META[id].description);

  const scaffoldCollab = (id: keyof typeof BUSINESS_COLLABORATION_META) =>
    businessSection(id, BUSINESS_COLLABORATION_META[id].title, [
      businessNode(
        { id: `collab-${id}`, kind: "brand", title: "Partnership opportunity", href: "/ugc", badge: "Open" },
        title,
      ),
    ], BUSINESS_COLLABORATION_META[id].description);

  return assembleBusinessGraph({
    contextKind: "creator",
    contextId: identity.id,
    contextTitle: title,
    profileBuilders: [
      () => businessSection("products-sold", BUSINESS_RELATION_META["products-sold"].title, sold),
      () => businessSection("products-promoted", BUSINESS_RELATION_META["products-promoted"].title, promoted),
      () => businessSection("affiliate-partnerships", BUSINESS_RELATION_META["affiliate-partnerships"].title, affiliates),
      () => businessSection("communities-managed", BUSINESS_RELATION_META["communities-managed"].title, communities),
      () => businessSection("courses-published", BUSINESS_RELATION_META["courses-published"].title, courses),
      () => businessSection("ugc-campaigns-joined", BUSINESS_RELATION_META["ugc-campaigns-joined"].title, ugc),
      () => businessSection("brand-collaborations", BUSINESS_RELATION_META["brand-collaborations"].title, brandCollabs),
      () => businessSection("followers", BUSINESS_RELATION_META.followers.title, followers),
      () => businessSection("business-reputation", BUSINESS_RELATION_META["business-reputation"].title, reputation),
    ],
    discoveryBuilders: [
      () => businessSection("suggested-creators", BUSINESS_DISCOVERY_META["suggested-creators"].title, [
        businessNode({ id: "sc-1", kind: "creator", title: "Creator in your niche", href: "/influencers/browse", badge: "Suggested" }, title),
      ], BUSINESS_DISCOVERY_META["suggested-creators"].description),
      () => scaffoldDiscovery("suggested-partners", "brand", "Brand partners"),
      () => scaffoldDiscovery("suggested-affiliates", "affiliate-program", "Affiliate programs"),
      () => scaffoldDiscovery("suggested-communities", "community", "Growth communities"),
      () => businessSection("suggested-products", BUSINESS_DISCOVERY_META["suggested-products"].title, sold.slice(0, 4)),
      () => businessSection("suggested-campaigns", BUSINESS_DISCOVERY_META["suggested-campaigns"].title, ugc.slice(0, 4)),
      () => scaffoldDiscovery("trending-collaborations", "brand", "Trending collabs"),
    ],
    collaborationBuilders: [
      () => scaffoldCollab("recommended-partnerships"),
      () => scaffoldCollab("potential-collaborators"),
      () => scaffoldCollab("campaign-invitations"),
      () => scaffoldCollab("brand-opportunities"),
      () => scaffoldCollab("creator-opportunities"),
      () => businessSection("affiliate-opportunities", BUSINESS_COLLABORATION_META["affiliate-opportunities"].title, affiliates.slice(0, 4)),
    ],
  });
}

export function buildCommunityBusinessGraph(community: CommunityDetailPayload): BusinessGraphPayload {
  const title = community.name;
  const owner = community.owner;

  const creators = owner
    ? [
        businessNode(
          {
            id: `creator-${owner.id}`,
            kind: "creator",
            title: owner.full_name ?? "Owner",
            href: owner.username ? `/influencers/${owner.username}` : `/influencers/u/${owner.id}`,
            imageUrl: owner.avatar_url,
          },
          title,
        ),
      ]
    : [];

  return assembleBusinessGraph({
    contextKind: "community",
    contextId: community.id,
    contextTitle: title,
    profileBuilders: [
      () => businessSection("communities-managed", "Hub leadership", creators),
      () =>
        businessSection("courses-published", "Courses in hub", [
          businessNode(
            {
              id: `course-${community.id}`,
              kind: "course",
              title: `${community.stats.course_count} courses`,
              href: `/communities/${community.slug}/learn`,
            },
            title,
          ),
        ]),
    ],
    discoveryBuilders: [
      () =>
        businessSection("suggested-creators", BUSINESS_DISCOVERY_META["suggested-creators"].title, creators),
      () =>
        businessSection("suggested-communities", BUSINESS_DISCOVERY_META["suggested-communities"].title, [
          businessNode({ id: `hub-${community.id}`, kind: "community", title, href: `/communities/${community.slug}` }, title),
        ]),
    ],
    collaborationBuilders: [
      () =>
        businessSection("brand-opportunities", BUSINESS_COLLABORATION_META["brand-opportunities"].title, [
          businessNode({ id: `bo-${community.id}`, kind: "brand", title: "Brand sponsorship slot", href: `/communities/${community.slug}` }, title),
        ]),
      () =>
        businessSection("creator-opportunities", BUSINESS_COLLABORATION_META["creator-opportunities"].title, creators),
    ],
  });
}

export function buildProductBusinessGraph(input: ProductBusinessGraphInput): BusinessGraphPayload {
  const title = input.product.name;
  const vendor = input.vendor;

  const sellerNodes = vendor?.business_slug
    ? [
        businessNode(
          {
            id: `seller-${vendor.id}`,
            kind: "seller",
            title: vendor.business_name ?? "Seller",
            href: `/influencers/${vendor.business_slug}`,
            imageUrl: vendor.business_logo ?? null,
          },
          title,
        ),
      ]
    : [];

  const productNodes = (input.relatedProducts ?? []).slice(0, 6).map((p) =>
    businessNode(
      {
        id: `prod-${p.id}`,
        kind: "product",
        title: p.name,
        href: productHref(p.slug),
        imageUrl: firstImage(p.images),
      },
      title,
    ),
  );

  return assembleBusinessGraph({
    contextKind: "product",
    contextId: input.product.id,
    contextTitle: title,
    profileBuilders: [
      () =>
        businessSection("products-sold", "This product", [
          businessNode(
            {
              id: `product-${input.product.id}`,
              kind: "product",
              title,
              href: productHref(input.product.slug),
              imageUrl: firstImage(input.product.images),
            },
            title,
          ),
        ]),
      () => businessSection("products-promoted", "Seller", sellerNodes),
    ],
    discoveryBuilders: [
      () => businessSection("suggested-products", BUSINESS_DISCOVERY_META["suggested-products"].title, productNodes),
      () =>
        businessSection("suggested-affiliates", BUSINESS_DISCOVERY_META["suggested-affiliates"].title, [
          businessNode(
            { id: `aff-${input.product.id}`, kind: "affiliate-program", title: `Promote ${title}`, href: productHref(input.product.slug) },
            title,
          ),
        ]),
    ],
    collaborationBuilders: [
      () =>
        businessSection("affiliate-opportunities", BUSINESS_COLLABORATION_META["affiliate-opportunities"].title, [
          businessNode(
            { id: `ao-${input.product.id}`, kind: "affiliate-program", title: "Affiliate partnership", href: productHref(input.product.slug) },
            title,
          ),
        ]),
    ],
  });
}

export function filterBusinessNodes(
  nodes: BusinessGraphPayload["searchableNodes"],
  query: string,
  kind: BusinessSearchKind | "all",
) {
  const q = query.trim().toLowerCase();
  return nodes.filter((n) => {
    const kindOk =
      kind === "all" ||
      n.kind === kind ||
      (kind === "campaign" && n.kind === "ugc-campaign") ||
      (kind === "seller" && (n.kind === "seller" || n.kind === "creator"));
    const textOk =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.subtitle?.toLowerCase().includes(q) ||
      n.kind.includes(q);
    return kindOk && textOk;
  });
}
