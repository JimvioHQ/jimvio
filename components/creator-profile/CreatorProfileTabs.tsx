"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Star, Users, BookOpen, Video, Percent } from "lucide-react";
import type {
  CreatorCampaign,
  CreatorCommunity,
  CreatorCourse,
  CreatorPost,
  CreatorProduct,
  CreatorReview,
  CreatorVideo,
} from "@/lib/creator-profile/types";
import { CreatorProfileProductGrid } from "./CreatorProfileProductGrid";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
      {children}
    </h3>
  );
}

export function CreatorProfileProductsTab({
  products,
  cartProductIds,
}: {
  products: CreatorProduct[];
  cartProductIds: Set<string>;
}) {
  const physical = products.filter((p) => p.productType === "physical");
  const digital = products.filter((p) => p.productType === "digital");
  const subscriptions = products.filter(
    (p) => p.pricingType === "subscription" || p.billingPeriod,
  );
  const featured = [...products].sort((a, b) => Number(b.saleCount ?? 0) - Number(a.saleCount ?? 0)).slice(0, 8);
  const newest = [...products]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 8);
  const bestSellers = featured;

  return (
    <div className="space-y-8">
      {featured.length > 0 && (
        <div>
          <SectionTitle>Featured products</SectionTitle>
          <CreatorProfileProductGrid products={featured} cartProductIds={cartProductIds} />
        </div>
      )}
      {physical.length > 0 && (
        <div>
          <SectionTitle>Physical products</SectionTitle>
          <CreatorProfileProductGrid products={physical} cartProductIds={cartProductIds} />
        </div>
      )}
      {digital.length > 0 && (
        <div>
          <SectionTitle>Digital products</SectionTitle>
          <CreatorProfileProductGrid products={digital} cartProductIds={cartProductIds} />
        </div>
      )}
      {subscriptions.length > 0 && (
        <div>
          <SectionTitle>Subscriptions</SectionTitle>
          <CreatorProfileProductGrid products={subscriptions} cartProductIds={cartProductIds} />
        </div>
      )}
      {newest.length > 0 && (
        <div>
          <SectionTitle>Newest products</SectionTitle>
          <CreatorProfileProductGrid products={newest} cartProductIds={cartProductIds} />
        </div>
      )}
      {bestSellers.length > 0 && (
        <div>
          <SectionTitle>Best sellers</SectionTitle>
          <CreatorProfileProductGrid products={bestSellers} cartProductIds={cartProductIds} />
        </div>
      )}
      {!products.length && <CreatorProfileProductGrid products={[]} cartProductIds={cartProductIds} />}
    </div>
  );
}

export function CreatorProfileCommunitiesTab({ communities }: { communities: CreatorCommunity[] }) {
  const owned = communities.filter((c) => c.role === "owner");
  const managed = communities.filter((c) => c.role === "managed");
  const premium = communities.filter((c) => c.isPremium);

  const Card = ({ c }: { c: CreatorCommunity }) => (
    <Link
      href={`/communities/${c.slug}`}
      className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/40"
    >
      <div className="relative aspect-[16/7] bg-[var(--color-surface-secondary)]">
        {c.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.coverImage} alt="" className="size-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="p-4">
        <p className="font-bold text-[var(--color-text-primary)]">{c.name}</p>
        <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">{c.tagline}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
          <Users className="size-3.5" />
          {c.memberCount.toLocaleString()} {c.memberCount === 1 ? "member" : "members"}
        </p>
      </div>
    </Link>
  );

  if (!communities.length) {
    return <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">No communities yet.</p>;
  }

  return (
    <div className="space-y-8">
      {owned.length > 0 && (
        <div>
          <SectionTitle>Communities owned</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">{owned.map((c) => <Card key={c.id} c={c} />)}</div>
        </div>
      )}
      {managed.length > 0 && (
        <div>
          <SectionTitle>Communities managed</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">{managed.map((c) => <Card key={c.id} c={c} />)}</div>
        </div>
      )}
      {premium.length > 0 && (
        <div>
          <SectionTitle>Premium communities</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">{premium.map((c) => <Card key={c.id} c={c} />)}</div>
        </div>
      )}
    </div>
  );
}

export function CreatorProfileCoursesTab({ courses }: { courses: CreatorCourse[] }) {
  if (!courses.length) {
    return <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">No published courses yet.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={`/marketplace/${course.slug}`}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/40"
        >
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
            <BookOpen className="size-5" />
          </div>
          <p className="font-bold text-[var(--color-text-primary)]">{course.title}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-semibold text-[var(--color-text-muted)]">
            <span>{course.students} students</span>
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {course.rating.toFixed(1)}
            </span>
            <span>{course.completionRate}% completion</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function CreatorProfileVideosTab({ videos }: { videos: CreatorVideo[] }) {
  const groups = {
    short: videos.filter((v) => v.kind === "short"),
    "live-replay": videos.filter((v) => v.kind === "live-replay"),
    product: videos.filter((v) => v.kind === "product"),
    ugc: videos.filter((v) => v.kind === "ugc"),
  };

  if (!videos.length) {
    return <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">No videos yet.</p>;
  }

  const Grid = ({ items }: { items: CreatorVideo[] }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((v) => (
        <Link
          key={v.id}
          href={v.href ?? "#"}
          className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
        >
          {v.thumbnailUrl ? (
            <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="size-10 fill-white text-white" />
          </div>
          <div className="absolute bottom-0 p-2 text-white">
            <p className="line-clamp-2 text-xs font-bold">{v.title}</p>
            <p className="text-[10px] text-white/75">{v.views.toLocaleString()} views</p>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {groups.short.length > 0 && (
        <div>
          <SectionTitle>Shorts</SectionTitle>
          <Grid items={groups.short} />
        </div>
      )}
      {groups["live-replay"].length > 0 && (
        <div>
          <SectionTitle>Live replays</SectionTitle>
          <Grid items={groups["live-replay"]} />
        </div>
      )}
      {groups.product.length > 0 && (
        <div>
          <SectionTitle>Product videos</SectionTitle>
          <Grid items={groups.product} />
        </div>
      )}
      {groups.ugc.length > 0 && (
        <div>
          <SectionTitle>UGC videos</SectionTitle>
          <Grid items={groups.ugc} />
        </div>
      )}
      {!groups.short.length && !groups["live-replay"].length && (
        <div>
          <SectionTitle>All videos</SectionTitle>
          <Grid items={videos} />
        </div>
      )}
    </div>
  );
}

export function CreatorProfileCampaignsTab({
  campaigns,
  type,
}: {
  campaigns: CreatorCampaign[];
  type: "ugc" | "affiliate";
}) {
  const Icon = type === "ugc" ? Video : Percent;
  if (!campaigns.length) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
        No {type === "ugc" ? "UGC" : "affiliate"} campaigns yet.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {campaigns.map((c) => (
        <Link
          key={c.id}
          href={c.href}
          className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/40"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
            <Icon className="size-4" />
          </span>
          <span className="min-w-0">
            <p className="truncate font-semibold text-[var(--color-text-primary)]">{c.title}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">{c.rateLabel ?? c.status}</p>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function CreatorProfileReviewsTab({
  reviews,
  stats,
}: {
  reviews: CreatorReview[];
  stats: { rating: number; reviewCount: number; responseTime: string };
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Average rating</p>
          <p className="mt-1 text-2xl font-black text-[var(--color-text-primary)]">{stats.rating.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Verified reviews</p>
          <p className="mt-1 text-2xl font-black text-[var(--color-text-primary)]">{stats.reviewCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Response rate</p>
          <p className="mt-1 text-2xl font-black text-[var(--color-text-primary)]">{stats.responseTime}</p>
        </div>
      </div>
      <div className="space-y-3">
        {reviews.length ? (
          reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-[var(--color-text-primary)]">{r.author}</p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star className="size-3.5 fill-current" />
                  {r.rating.toFixed(1)}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{r.content}</p>
              {r.verified && (
                <p className="mt-2 text-[10px] font-bold uppercase text-emerald-600">Verified purchase</p>
              )}
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}

export function CreatorProfilePostsTab({ posts }: { posts: CreatorPost[] }) {
  if (!posts.length) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
        Posts feed connects here — UI ready for creator updates.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Link key={post.id} href={post.href} className="block rounded-xl border border-[var(--color-border)] p-4">
          <p className="font-semibold text-[var(--color-text-primary)]">{post.title}</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{post.excerpt}</p>
        </Link>
      ))}
    </div>
  );
}

export function CreatorProfileAboutTab({
  identity,
  stats,
}: {
  identity: { displayName: string; bio: string; country: string; languages: string[]; joinedAt: string | null };
  stats: { totalSales: number; rating: number; responseTime: string };
}) {
  return (
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-black text-[var(--color-text-primary)]">About {identity.displayName}</h3>
      <p className="text-[var(--color-text-secondary)] leading-relaxed">{identity.bio}</p>
      <div className="not-prose mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { label: "Country", value: identity.country },
          { label: "Languages", value: identity.languages.join(", ") },
          { label: "Total sales", value: stats.totalSales.toLocaleString() },
          { label: "Seller reputation", value: `${stats.rating.toFixed(1)} / 5` },
          { label: "Response time", value: stats.responseTime },
          { label: "Member since", value: identity.joinedAt ? new Date(identity.joinedAt).getFullYear() : "—" },
        ].map((row) => (
          <div key={row.label} className="rounded-xl border border-[var(--color-border)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">{row.label}</p>
            <p className="mt-1 font-semibold text-[var(--color-text-primary)]">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
