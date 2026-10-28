import type { CreatorProfilePayload } from "@/lib/creator-profile/types";
import type { CommunityDetailPayload } from "@/components/community/community-detail-view";
import { normalizeImages } from "@/lib/utils";
import { assembleCommerceGraph, graphNode, graphSection } from "./build";
import type { CommerceGraphPayload, GraphPathStep } from "./types";

export type ProductGraphInput = {
  product: {
    id: string;
    name: string;
    slug?: string | null;
    price?: number;
    images?: unknown;
    product_type?: string | null;
    vendor_id?: string | null;
    category?: string | null;
  };
  vendor?: {
    id?: string;
    business_name?: string | null;
    business_slug?: string | null;
    business_logo?: string | null;
    follower_count?: number | null;
  } | null;
  relatedProducts?: Array<{
    id: string;
    name: string;
    slug?: string | null;
    price?: number;
    images?: unknown;
    product_type?: string | null;
  }>;
  frequentlyBoughtTogether?: Array<{
    id: string;
    name: string;
    slug?: string | null;
    price?: number;
    images?: unknown;
  }>;
};

function productHref(slug?: string | null) {
  return slug ? `/marketplace/${slug}` : "/marketplace";
}

function firstImage(images: unknown): string | null {
  const normalized = normalizeImages(images);
  return normalized[0] ?? null;
}

function productPath(input: ProductGraphInput): GraphPathStep[] {
  const steps: GraphPathStep[] = [
    {
      id: `product-${input.product.id}`,
      kind: "product",
      label: input.product.name,
      href: productHref(input.product.slug),
    },
  ];
  if (input.vendor?.business_slug) {
    steps.push({
      id: `creator-${input.vendor.id ?? input.vendor.business_slug}`,
      kind: "creator",
      label: input.vendor.business_name ?? "Creator",
      href: `/influencers/${input.vendor.business_slug}`,
    });
  }
  return steps;
}

export function buildProductCommerceGraph(input: ProductGraphInput): CommerceGraphPayload {
  const title = input.product.name;
  const related = input.relatedProducts ?? [];
  const fbt = input.frequentlyBoughtTogether ?? [];
  const vendor = input.vendor;
  const category = input.product.category ?? "this category";

  const creatorNodes = vendor?.business_slug
    ? [
        graphNode(
          {
            id: `creator-${vendor.id ?? vendor.business_slug}`,
            kind: "creator",
            title: vendor.business_name ?? "Creator",
            subtitle: vendor.follower_count ? `${vendor.follower_count} followers` : "Store owner",
            href: `/influencers/${vendor.business_slug}`,
            imageUrl: vendor.business_logo ?? null,
            badge: "Creator",
          },
          title,
        ),
      ]
    : [];

  const relatedProductNodes = related.slice(0, 12).map((p) =>
    graphNode(
      {
        id: `product-${p.id}`,
        kind: p.product_type === "bundle" ? "bundle" : "product",
        title: p.name,
        subtitle: p.price != null ? `$${p.price}` : undefined,
        href: productHref(p.slug),
        imageUrl: firstImage(p.images),
      },
      title,
    ),
  );

  const fbtNodes = fbt.slice(0, 8).map((p) =>
    graphNode(
      {
        id: `fbt-${p.id}`,
        kind: "product",
        title: p.name,
        href: productHref(p.slug),
        imageUrl: firstImage(p.images),
        badge: "Often bought together",
      },
      title,
    ),
  );

  const ugcNodes = related.slice(0, 4).map((p, i) =>
    graphNode(
      {
        id: `ugc-${p.id}-${i}`,
        kind: "campaign",
        title: `UGC: ${p.name}`,
        subtitle: "Creator video campaign",
        href: "/ugc",
        imageUrl: firstImage(p.images),
        badge: "UGC",
      },
      title,
    ),
  );

  const communityNodes = vendor?.business_slug
    ? [
        graphNode(
          {
            id: `community-${vendor.business_slug}`,
            kind: "community",
            title: `${vendor.business_name ?? "Creator"} Hub`,
            subtitle: "Community discussing this product",
            href: `/communities?search=${encodeURIComponent(vendor.business_name ?? "")}`,
            imageUrl: vendor.business_logo ?? null,
            badge: "Community",
          },
          title,
        ),
      ]
    : [];

  const courseNodes = [
    graphNode(
      {
        id: `course-${input.product.id}`,
        kind: "course",
        title: `Master ${category}`,
        subtitle: "Course teaching this topic",
        href: "/marketplace?type=digital",
        badge: "Course",
      },
      title,
    ),
  ];

  const eventNodes = [
    graphNode(
      {
        id: `event-${input.product.id}`,
        kind: "live-event",
        title: `Live: ${title} showcase`,
        subtitle: "Upcoming creator session",
        href: "/communities",
        badge: "Live",
      },
      title,
    ),
  ];

  const affiliateNodes = [
    graphNode(
      {
        id: `affiliate-${input.product.id}`,
        kind: "affiliate",
        title: `Promote ${title}`,
        subtitle: "Affiliate opportunity",
        href: productHref(input.product.slug),
        badge: "Affiliate",
      },
      title,
    ),
  ];

  const bundleNodes = related
    .filter((p) => p.product_type === "bundle")
    .slice(0, 6)
    .map((p) =>
      graphNode(
        {
          id: `bundle-${p.id}`,
          kind: "bundle",
          title: p.name,
          href: productHref(p.slug),
          imageUrl: firstImage(p.images),
        },
        title,
      ),
    );

  const collectionNodes = [
    graphNode(
      {
        id: `collection-${input.product.id}`,
        kind: "collection",
        title: `${category} collection`,
        subtitle: "Curated digital collection",
        href: "/marketplace?type=digital",
      },
      title,
    ),
  ];

  const promotingNodes = creatorNodes.length
    ? creatorNodes.map((n) => ({ ...n, badge: "Promoting" }))
    : [];

  return assembleCommerceGraph({
    contextKind: "product",
    contextId: input.product.id,
    contextTitle: title,
    path: productPath(input),
    panelSectionIds: [
      "related-creators",
      "communities-discussing",
      "affiliate-opportunities",
      "upcoming-events",
    ],
    sectionBuilders: [
      () => graphSection("related-creators", creatorNodes),
      () => graphSection("related-products", relatedProductNodes),
      () => graphSection("people-also-bought", fbtNodes.length ? fbtNodes : relatedProductNodes.slice(0, 6)),
      () => graphSection("creators-promoting", promotingNodes),
      () => graphSection("ugc-using", ugcNodes),
      () => graphSection("communities-discussing", communityNodes),
      () => graphSection("courses-teaching", courseNodes),
      () => graphSection("upcoming-events", eventNodes),
      () => graphSection("affiliate-opportunities", affiliateNodes),
      () => graphSection("bundles", bundleNodes),
      () => graphSection("collections", collectionNodes),
    ],
  });
}

export function buildCreatorCommerceGraph(payload: CreatorProfilePayload): CommerceGraphPayload {
  const { identity } = payload.profile;
  const title = identity.displayName;

  const path: GraphPathStep[] = [
    {
      id: `creator-${identity.id}`,
      kind: "creator",
      label: title,
      href: `/influencers/${identity.slug}`,
    },
  ];
  if (payload.communities[0]) {
    path.push({
      id: `community-${payload.communities[0].id}`,
      kind: "community",
      label: payload.communities[0].name,
      href: `/communities/${payload.communities[0].slug}`,
    });
  }
  if (payload.products[0]) {
    path.push({
      id: `product-${payload.products[0].id}`,
      kind: "product",
      label: payload.products[0].name,
      href: productHref(payload.products[0].slug),
    });
  }

  const productNodes = payload.products.slice(0, 12).map((p) =>
    graphNode(
      {
        id: `product-${p.id}`,
        kind: p.productType === "bundle" ? "bundle" : "product",
        title: p.name,
        subtitle: `$${p.price}`,
        href: productHref(p.slug),
        imageUrl: firstImage(p.images),
      },
      title,
    ),
  );

  const communityNodes = payload.communities.slice(0, 8).map((c) =>
    graphNode(
      {
        id: `community-${c.id}`,
        kind: "community",
        title: c.name,
        subtitle: `${c.memberCount} ${c.memberCount === 1 ? "member" : "members"}`,
        href: `/communities/${c.slug}`,
        imageUrl: c.avatarImage ?? c.coverImage ?? null,
      },
      title,
    ),
  );

  const courseNodes = payload.courses.slice(0, 8).map((c) =>
    graphNode(
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

  const campaignNodes = [...payload.ugcCampaigns, ...payload.affiliateCampaigns].slice(0, 8).map((c) =>
    graphNode(
      {
        id: `campaign-${c.id}`,
        kind: c.type === "affiliate" ? "affiliate" : "campaign",
        title: c.title,
        subtitle: c.rateLabel,
        href: c.href,
        badge: c.type === "ugc" ? "UGC" : "Affiliate",
      },
      title,
    ),
  );

  const eventNodes = [
    graphNode(
      {
        id: `event-${identity.id}`,
        kind: "live-event",
        title: `${title} live session`,
        subtitle: "Upcoming creator event",
        href: identity.storeHref ?? `/influencers/${identity.slug}`,
        badge: "Live",
      },
      title,
    ),
  ];

  const storeNode = identity.storeHref
    ? [
        graphNode(
          {
            id: `store-${identity.id}`,
            kind: "product",
            title: `${title}'s store`,
            subtitle: "View all products",
            href: identity.storeHref,
            imageUrl: identity.avatarImage,
            badge: "Store",
          },
          title,
        ),
      ]
    : [];

  return assembleCommerceGraph({
    contextKind: "creator",
    contextId: identity.id,
    contextTitle: title,
    path,
    panelSectionIds: ["creator-products", "creator-communities", "creator-campaigns", "upcoming-events"],
    sectionBuilders: [
      () => graphSection("creator-products", productNodes),
      () => graphSection("creator-communities", communityNodes),
      () => graphSection("creator-courses", courseNodes),
      () => graphSection("creator-campaigns", campaignNodes),
      () => graphSection("related-products", storeNode),
      () => graphSection("upcoming-events", eventNodes),
      () => graphSection("affiliate-opportunities", payload.affiliateCampaigns.slice(0, 6).map((c) =>
        graphNode(
          {
            id: `aff-${c.id}`,
            kind: "affiliate",
            title: c.title,
            href: c.href,
            badge: "Affiliate",
          },
          title,
        ),
      )),
    ],
  });
}

export function buildCommunityCommerceGraph(community: CommunityDetailPayload): CommerceGraphPayload {
  const title = community.name;
  const owner = community.owner;

  const path: GraphPathStep[] = [
    {
      id: `community-${community.id}`,
      kind: "community",
      label: title,
      href: `/communities/${community.slug}`,
    },
  ];
  if (owner?.username || owner?.full_name) {
    path.push({
      id: `creator-${owner.id}`,
      kind: "creator",
      label: owner.full_name ?? "Creator",
      href: owner.username ? `/influencers/${owner.username}` : `/influencers/u/${owner.id}`,
    });
  }

  const creatorNodes = owner
    ? [
        graphNode(
          {
            id: `creator-${owner.id}`,
            kind: "creator",
            title: owner.full_name ?? "Community owner",
            href: owner.username ? `/influencers/${owner.username}` : `/influencers/u/${owner.id}`,
            imageUrl: owner.avatar_url,
            badge: "Owner",
          },
          title,
        ),
        ...community.recent_members.slice(0, 5).map((m) =>
          graphNode(
            {
              id: `member-${m.id}`,
              kind: "creator",
              title: m.full_name ?? "Member",
              href: m.username ? `/influencers/${m.username}` : `/influencers/u/${m.id}`,
              imageUrl: m.avatar_url,
              badge: "Member",
            },
            title,
          ),
        ),
      ]
    : [];

  const productNodes = [
    graphNode(
      {
        id: `product-hub-${community.id}`,
        kind: "product",
        title: `${title} marketplace picks`,
        subtitle: "Products in this hub",
        href: `/communities/${community.slug}`,
      },
      title,
    ),
  ];

  const courseNodes =
    community.stats.course_count > 0
      ? [
          graphNode(
            {
              id: `course-hub-${community.id}`,
              kind: "course",
              title: `${community.stats.course_count} courses available`,
              subtitle: `${community.stats.lesson_count} lessons`,
              href: `/communities/${community.slug}/learn`,
              badge: "Course",
            },
            title,
          ),
        ]
      : [];

  const eventNodes = [
    graphNode(
      {
        id: `event-hub-${community.id}`,
        kind: "live-event",
        title: `${title} live room`,
        subtitle: "Join upcoming session",
        href: `/communities/${community.slug}/live`,
        badge: "Live",
      },
      title,
    ),
  ];

  const campaignNodes = [
    graphNode(
      {
        id: `campaign-hub-${community.id}`,
        kind: "campaign",
        title: "Community UGC campaigns",
        subtitle: "Earn with member content",
        href: "/ugc",
        badge: "UGC",
      },
      title,
    ),
    graphNode(
      {
        id: `affiliate-hub-${community.id}`,
        kind: "affiliate",
        title: "Community affiliate offers",
        subtitle: "Promote hub products",
        href: `/communities/${community.slug}`,
        badge: "Affiliate",
      },
      title,
    ),
  ];

  return assembleCommerceGraph({
    contextKind: "community",
    contextId: community.id,
    contextTitle: title,
    path,
    panelSectionIds: ["community-creators", "community-products", "community-courses", "community-events"],
    sectionBuilders: [
      () => graphSection("community-creators", creatorNodes),
      () => graphSection("community-products", productNodes),
      () => graphSection("community-courses", courseNodes),
      () => graphSection("community-events", eventNodes),
      () => graphSection("ugc-using", campaignNodes.filter((n) => n.kind === "campaign")),
      () => graphSection("affiliate-opportunities", campaignNodes.filter((n) => n.kind === "affiliate")),
    ],
  });
}
