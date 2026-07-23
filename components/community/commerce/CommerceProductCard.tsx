"use client";

import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  ShoppingCart,
  Share2,
  Star,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addToCart } from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";
import {
  discountPercent,
  formatCommercePrice,
  useCreatorCommerceStore,
  type CommerceEmbed,
} from "@/lib/community/commerce";
import { toast } from "sonner";
import { useState } from "react";

export function CommerceProductCard({
  embed,
  compact,
}: {
  embed: CommerceEmbed;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const incrementCartCount = useCartStore((s) => s.incrementCartCount);
  const toggleBookmark = useCreatorCommerceStore((s) => s.toggleBookmark);
  const bookmarked = useCreatorCommerceStore((s) => s.isBookmarked(embed.id));
  const pct = discountPercent(embed.price, embed.compareAtPrice);
  const href = embed.href || `/marketplace/${embed.id}`;

  async function onAddToCart() {
    if (!embed.sellerId) {
      toast.message("Open product to add to cart");
      return;
    }
    setBusy(true);
    try {
      const result = await addToCart(embed.id, embed.sellerId);
      if (result && "error" in result && result.error) {
        throw new Error(String(result.error));
      }
      if (result && "success" in result && result.success === false) {
        throw new Error(
          "error" in result ? String(result.error) : "Could not add to cart"
        );
      }
      incrementCartCount(1);
      toast.success("Added to cart");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not add to cart");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(
        typeof window !== "undefined" ? `${window.location.origin}${href}` : href
      );
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]",
        compact ? "max-w-[280px]" : "max-w-sm"
      )}
    >
      {embed.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={embed.imageUrl}
          alt=""
          className={cn("w-full object-cover", compact ? "h-28" : "h-36")}
        />
      )}
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
              {embed.title}
            </p>
            {embed.sellerName && (
              <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                {embed.sellerName}
              </p>
            )}
          </div>
          {(pct != null || embed.discountLabel) && (
            <span className="shrink-0 rounded-md bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-accent)]">
              {embed.discountLabel || `−${pct}%`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-[var(--color-text-primary)]">
            {formatCommercePrice(embed.price, embed.currency)}
          </span>
          {embed.compareAtPrice != null && embed.compareAtPrice > (embed.price ?? 0) && (
            <span className="text-[11px] text-[var(--color-text-muted)] line-through">
              {formatCommercePrice(embed.compareAtPrice, embed.currency)}
            </span>
          )}
          {embed.inventory != null && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {embed.inventory > 0 ? `${embed.inventory} left` : "Sold out"}
            </span>
          )}
        </div>

        {(embed.rating != null || (embed.variants && embed.variants.length > 0)) && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
            {embed.rating != null && (
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {embed.rating.toFixed(1)}
                {embed.reviewCount != null ? ` (${embed.reviewCount})` : ""}
              </span>
            )}
            {embed.variants?.slice(0, 3).map((v) => (
              <span
                key={v}
                className="rounded bg-[var(--color-surface-secondary)] px-1.5 py-0.5"
              >
                {v}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <Link
            href={href}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--color-accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white"
          >
            <Zap className="h-3 w-3" />
            Buy Now
          </Link>
          <button
            type="button"
            disabled={busy || embed.inventory === 0}
            onClick={() => void onAddToCart()}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 disabled:opacity-50"
          >
            <ShoppingCart className="h-3 w-3" />
            Cart
          </button>
          <button
            type="button"
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            onClick={() => toggleBookmark(embed.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)]"
          >
            {bookmarked ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            aria-label="Share"
            onClick={() => void share()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)]"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
