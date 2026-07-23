"use client";

import Link from "next/link";
import { ShoppingBag, Sparkles, Users } from "lucide-react";
import {
  useCreatorCommerceStore,
  type CommunityStoreItem,
} from "@/lib/community/commerce";
import { MessageCommerceEmbed } from "./MessageCommerceEmbed";

/**
 * Community storefront shelf — featured products, courses, creators.
 */
export function CommunityStorefront({
  communityId,
  base,
  communityName,
  courses,
  recommendedCreators,
}: {
  communityId: string;
  base: string;
  communityName?: string;
  courses?: { id: string; title: string; href: string }[];
  recommendedCreators?: { id: string; name: string; href?: string }[];
}) {
  const items = useCreatorCommerceStore((s) =>
    s.featuredForCommunity(communityId)
  );
  const products = items.filter(
    (i) => i.kind === "product" || i.kind === "marketplace_item"
  );
  const featuredCourses = items.filter((i) => i.kind === "course");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Community Store
        </p>
        <h3 className="mt-1 text-base font-bold text-[var(--color-text-primary)]">
          {communityName ? `${communityName} marketplace` : "Marketplace"}
        </h3>
        <p className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">
          Featured products, courses, and creators — buy without leaving the
          workspace.
        </p>
      </header>

      <Shelf
        title="Featured products"
        icon={ShoppingBag}
        empty={products.length === 0}
        emptyHint="Staff can feature products from chat (Attach commerce → Feature in store)."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => (
            <StoreItem key={`${p.id}-${p.createdAt}`} item={p} />
          ))}
        </div>
      </Shelf>

      <Shelf
        title="Featured courses"
        icon={Sparkles}
        empty={featuredCourses.length === 0 && !(courses && courses.length > 0)}
        emptyHint="Enroll from Courses or share a course card in chat."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {featuredCourses.map((c) => (
            <StoreItem key={`${c.id}-${c.createdAt}`} item={c} />
          ))}
          {courses?.slice(0, 4).map((c) => (
            <Link
              key={c.id}
              href={c.href}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm font-medium hover:border-[var(--color-accent)]/40"
            >
              {c.title}
            </Link>
          ))}
        </div>
      </Shelf>

      <Shelf
        title="Recommended creators"
        icon={Users}
        empty={!recommendedCreators || recommendedCreators.length === 0}
        emptyHint="Creator profiles appear as members publish store items."
        href={`${base}/members`}
      >
        <ul className="space-y-2">
          {recommendedCreators?.map((c) => (
            <li key={c.id}>
              <Link
                href={c.href ?? `${base}/members`}
                className="block rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </Shelf>
    </div>
  );
}

function StoreItem({ item }: { item: CommunityStoreItem }) {
  return <MessageCommerceEmbed embed={item} compact />;
}

function Shelf({
  title,
  icon: Icon,
  children,
  empty,
  emptyHint,
  href,
}: {
  title: string;
  icon: typeof ShoppingBag;
  children: React.ReactNode;
  empty?: boolean;
  emptyHint?: string;
  href?: string;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          <Icon className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          {title}
        </h4>
        {href && (
          <Link
            href={href}
            className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
          >
            View all
          </Link>
        )}
      </div>
      {empty ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-[13px] text-[var(--color-text-muted)]">
          {emptyHint}
        </p>
      ) : (
        children
      )}
    </section>
  );
}
