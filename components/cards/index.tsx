"use client";

/**
 * Card variants built on <CardShell />.
 *
 * Exports:
 *   CommunityCard   — for community listings
 *   ProductCard     — for marketplace products
 *   AffiliateCard   — for affiliate program product tiles
 *
 * All cards accept a `showQuickActions` prop that toggles the hover-reveal
 * action row, and forward the `accent` colour to CardShell.
 */

import React from "react";
import { ArrowRight, Star } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { CardShell } from "@/components/ui/card-shell";

// ─── shared icons ─────────────────────────────────────────────────────────────

const IconUsers = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M11 14v-1.5A3.5 3.5 0 0 0 7.5 9h-4A3.5 3.5 0 0 0 0 12.5V14" strokeLinecap="round" />
        <circle cx="5.5" cy="4.5" r="2.5" />
        <path d="M16 14v-1.338A3.5 3.5 0 0 0 13.5 9.5" strokeLinecap="round" />
        <path d="M11 2a2.5 2.5 0 0 1 0 5" strokeLinecap="round" />
    </svg>
);

const IconMsg = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 3h12v9H9.5L8 14l-1.5-2H2V3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconLock = () => (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8">
        <rect x="3" y="7" width="10" height="8" rx="2" />
        <path d="M5 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
);

const IconShare = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="3" r="2" /><circle cx="12" cy="13" r="2" /><circle cx="4" cy="8" r="2" />
        <path d="M4 8l6-4M4 8l6 4" strokeLinecap="round" />
    </svg>
);

const IconCopy = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="5" width="9" height="9" rx="2" /><path d="M2 11V2h9" strokeLinecap="round" />
    </svg>
);

const IconLink = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 9a3 3 0 0 0 4.243.121l2-2A3 3 0 0 0 9 2.757l-1.072 1.072" strokeLinecap="round" />
        <path d="M9 7a3 3 0 0 0-4.243-.121l-2 2A3 3 0 0 0 7 13.243l1.071-1.072" strokeLinecap="round" />
    </svg>
);

const ArrowIcon = () => (
    <svg
        className="transition-transform duration-200 group-hover/btn:translate-x-0.5"
        width="14" height="14" viewBox="0 0 16 16" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    >
        <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
);

function isNew(created_at?: string | null) {
    if (!created_at) return false;
    return Date.now() - new Date(created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
}

// ─── meta pill ────────────────────────────────────────────────────────────────

function MetaPill({ icon, value }: { icon: React.ReactNode; value: string }) {
    return (
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 dark:text-stone-500">
            {icon}
            {value}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. COMMUNITY CARD
// ═══════════════════════════════════════════════════════════════════════════════

export type CommunityRow = {
    id: string;
    name: string;
    slug: string;
    tagline?: string | null;
    category?: string | null;
    member_count?: number | null;
    post_count?: number | null;
    is_free?: boolean | null;
    monthly_price?: number | null;
    currency?: string | null;
    cover_image?: string | null;
    image_url?: string | null;
    avatar_url?: string | null;
    created_at?: string | null;
    profiles?: { full_name: string | null; avatar_url: string | null; username?: string | null } | null;
};

interface CommunityCardProps {
    c: CommunityRow;
    rank?: number;
    showQuickActions?: boolean;
    accent?: string;
}

export function CommunityCard({
    c,
    rank,
    showQuickActions = true,
    accent = "#fd5000",
}: CommunityCardProps) {
    const initial = c.name?.[0]?.toUpperCase() ?? "?";
    const newCommunity = isNew(c.created_at);

    function handleShare(e: React.MouseEvent) {
        e.preventDefault();
        const url = `${typeof window !== "undefined" ? window.location.origin : ""}/communities/${c.slug}`;
        if (typeof window !== "undefined" && navigator.share) {
            navigator.share({ title: c.name, url });
        } else if (typeof window !== "undefined") {
            navigator.clipboard.writeText(url);
        }
    }

    return (
        <CardShell href={`/communities/${c.slug}`} accent={accent}>
            <CardShell.Cover
                src={c.cover_image}
                fallbackInitial={initial}
            >
                {newCommunity && (
                    <CardShell.Badge slot="top-left" variant="new">New</CardShell.Badge>
                )}
                {rank && rank <= 3 && (
                    <CardShell.Badge slot="top-right" variant="rank">#{rank}</CardShell.Badge>
                )}
                {!c.is_free && (
                    <CardShell.Badge slot="bottom-right" variant="premium">
                        <IconLock />
                        Premium
                    </CardShell.Badge>
                )}
            </CardShell.Cover>

            <CardShell.Avatar
                src={c.avatar_url ?? c.image_url}
                initial={initial}
                shape="rounded"
            />

            <CardShell.Body padTop="avatar">
                {/* Name + tagline */}
                <h2 className="text-[15px] font-semibold tracking-tight leading-snug text-[#1a1714] dark:text-[#ededec] group-hover:text-[var(--card-accent,#fd5000)] transition-colors duration-200 line-clamp-1">
                    {c.name}
                </h2>
                <p className="mt-1 text-[12px] text-[#6b6660] dark:text-[#787470] leading-relaxed font-normal line-clamp-2">
                    {c.tagline ?? "An exclusive community for people who mean business."}
                </p>

                {/* Meta pills */}
                <div className="flex items-center gap-3 flex-wrap mt-3">
                    {c.category && (
                        <span className="text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-stone-100 dark:bg-white/5 text-stone-500 dark:text-stone-400 border border-black/[0.06] dark:border-white/[0.06]">
                            {c.category}
                        </span>
                    )}
                    <MetaPill icon={<IconUsers />} value={formatNumber(c.member_count ?? 0)} />
                    <MetaPill icon={<IconMsg />} value={formatNumber(c.post_count ?? 0)} />
                </div>

                <CardShell.Divider />

                {/* Price */}
                <div className="mb-3">
                    {c.is_free ? (
                        <span className="inline-flex text-[10.5px] font-bold tracking-wide uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                            Free Access
                        </span>
                    ) : c.monthly_price ? (
                        <div className="flex items-baseline gap-0.5">
                            <span className="font-mono text-[20px] text-[#1a1714] dark:text-white leading-none">
                                {c.monthly_price.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-stone-400 ml-0.5">
                                {c.currency ?? "RWF"}/mo
                            </span>
                        </div>
                    ) : (
                        <span className="inline-flex text-[10.5px] font-semibold text-stone-400 bg-stone-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                            Private Hub
                        </span>
                    )}
                </div>

                {/* CTA */}
                <CardShell.PrimaryButton icon={<ArrowIcon />}>
                    Join Community
                </CardShell.PrimaryButton>

                {/* Quick actions */}
                {showQuickActions && (
                    <CardShell.Actions className="mt-2">
                        <CardShell.ActionButton onClick={handleShare} icon={<IconShare />} hoverColor="orange">
                            Share
                        </CardShell.ActionButton>
                        <CardShell.ActionButton
                            href={`/communities/create?template=${c.category ?? "other"}`}
                            icon={<IconCopy />}
                            hoverColor="indigo"
                        >
                            Clone
                        </CardShell.ActionButton>
                    </CardShell.Actions>
                )}
            </CardShell.Body>
        </CardShell>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. PRODUCT CARD
// ═══════════════════════════════════════════════════════════════════════════════

export type ProductRow = {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    price: number;
    compare_price?: number | null;
    currency?: string | null;
    category?: string | null;
    cover_image?: string | null;
    rating?: number | null;
    review_count?: number | null;
    sale_count?: number | null;
    is_featured?: boolean | null;
    in_stock?: boolean | null;
    created_at?: string | null;
};

interface ProductCardProps {
    p: ProductRow;
    rank?: number;
    showQuickActions?: boolean;
    accent?: string;
    onAddToCart?: (id: string) => void;
}

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={cn("h-2.5 w-2.5", n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-stone-200 dark:text-stone-700")}
                />
            ))}
        </div>
    );
}

export function ProductCard({
    p,
    rank,
    showQuickActions = true,
    accent = "#fd5000",
    onAddToCart,
}: ProductCardProps) {
    const initial = p.name?.[0]?.toUpperCase() ?? "?";
    const newProduct = isNew(p.created_at);
    const discount = p.compare_price && p.compare_price > p.price
        ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100)
        : null;

    function handleWishlist(e: React.MouseEvent) {
        e.preventDefault();
        // wishlist logic here
    }

    function handleAddToCart(e: React.MouseEvent) {
        e.preventDefault();
        onAddToCart?.(p.id);
    }

    return (
        <CardShell href={`/marketplace/${p.slug}`} accent={accent}>
            <CardShell.Cover src={p.cover_image} fallbackInitial={initial} height={160}>
                {newProduct && (
                    <CardShell.Badge slot="top-left" variant="new">New</CardShell.Badge>
                )}
                {discount && (
                    <CardShell.Badge slot="top-right" variant="rank">
                        -{discount}%
                    </CardShell.Badge>
                )}
                {p.is_featured && !discount && (
                    <CardShell.Badge slot="top-right" className="bg-amber-400/90 text-amber-900 border-amber-300/40">
                        Featured
                    </CardShell.Badge>
                )}
                {p.in_stock === false && (
                    <CardShell.Badge slot="bottom-left" variant="premium">
                        Out of stock
                    </CardShell.Badge>
                )}
            </CardShell.Cover>

            <CardShell.Body padTop="normal">
                {/* Category */}
                {p.category && (
                    <span className="text-[10px] font-semibold tracking-wide uppercase text-stone-400 dark:text-stone-500 mb-1.5 block">
                        {p.category}
                    </span>
                )}

                {/* Name */}
                <h2 className="text-[15px] font-semibold tracking-tight leading-snug text-[#1a1714] dark:text-[#ededec] group-hover:text-[var(--card-accent,#fd5000)] transition-colors duration-200 line-clamp-2 mb-2">
                    {p.name}
                </h2>

                {/* Rating row */}
                {p.rating != null && (
                    <div className="flex items-center gap-2 mb-3">
                        <StarRating rating={p.rating} />
                        {p.review_count != null && (
                            <span className="text-[11px] text-stone-400">
                                ({formatNumber(p.review_count)})
                            </span>
                        )}
                        {p.sale_count != null && (
                            <span className="text-[11px] text-stone-400 ml-auto">
                                {formatNumber(p.sale_count)} sold
                            </span>
                        )}
                    </div>
                )}

                <CardShell.Divider />

                {/* Price row */}
                <div className="flex items-end justify-between mb-3">
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-mono text-[20px] font-bold text-[#1a1714] dark:text-white leading-none">
                                {p.price.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-stone-400">{p.currency ?? "RWF"}</span>
                        </div>
                        {p.compare_price && p.compare_price > p.price && (
                            <span className="text-[11px] text-stone-400 line-through">
                                {p.compare_price.toLocaleString()} {p.currency ?? "RWF"}
                            </span>
                        )}
                    </div>
                    {rank && rank <= 3 && (
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                            #{rank} this week
                        </span>
                    )}
                </div>

                {/* CTA */}
                <CardShell.PrimaryButton onClick={handleAddToCart} icon={<ArrowIcon />}>
                    {p.in_stock === false ? "Notify Me" : "Add to Cart"}
                </CardShell.PrimaryButton>

                {/* Quick actions */}
                {showQuickActions && (
                    <CardShell.Actions className="mt-2">
                        <CardShell.ActionButton onClick={handleWishlist} icon={<IconShare />} hoverColor="orange">
                            Wishlist
                        </CardShell.ActionButton>
                        <CardShell.ActionButton href={`/marketplace/${p.slug}`} icon={<IconLink />} hoverColor="indigo">
                            Details
                        </CardShell.ActionButton>
                    </CardShell.Actions>
                )}
            </CardShell.Body>
        </CardShell>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. AFFILIATE CARD
// ═══════════════════════════════════════════════════════════════════════════════

export type AffiliateProductRow = {
    id: string;
    name: string;
    slug: string;
    category?: string | null;
    cover_image?: string | null;
    price: number;
    currency?: string | null;
    commission_rate: number;       // e.g. 15 = 15%
    avg_earning_per_sale: number;  // computed: price * rate/100
    engagement?: number | null;    // sale_count + view_count
    created_at?: string | null;
};

interface AffiliateCardProps {
    p: AffiliateProductRow;
    rank?: number;
    showQuickActions?: boolean;
    accent?: string;
}

export function AffiliateCard({
    p,
    rank,
    showQuickActions = true,
    accent = "#fd5000",
}: AffiliateCardProps) {
    const initial = p.name?.[0]?.toUpperCase() ?? "?";

    function handleCopyLink(e: React.MouseEvent) {
        e.preventDefault();
        const url = `${typeof window !== "undefined" ? window.location.origin : ""}/marketplace/${p.slug}?ref=affiliate`;
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(url);
        }
    }

    return (
        <CardShell href={`/marketplace/${p.slug}`} accent={accent}>
            <CardShell.Cover src={p.cover_image} fallbackInitial={initial} height={140}>
                {rank && rank <= 3 && (
                    <CardShell.Badge slot="top-right" variant="rank">#{rank}</CardShell.Badge>
                )}
                {/* Commission rate as a prominent badge */}
                <CardShell.Badge slot="bottom-left" className="bg-black/55 backdrop-blur-sm text-white border-white/15 text-[12px] font-bold">
                    {p.commission_rate}% commission
                </CardShell.Badge>
            </CardShell.Cover>

            <CardShell.Body padTop="normal">
                {/* Category */}
                {p.category && (
                    <span className="text-[10px] font-semibold tracking-wide uppercase text-stone-400 dark:text-stone-500 mb-1.5 block">
                        {p.category}
                    </span>
                )}

                {/* Name */}
                <h2 className="text-[15px] font-semibold tracking-tight leading-snug text-[#1a1714] dark:text-[#ededec] group-hover:text-[var(--card-accent,#fd5000)] transition-colors duration-200 line-clamp-2 mb-4">
                    {p.name}
                </h2>

                {/* Commission rate — large typographic treatment */}
                <div className="flex items-center gap-3 mb-4">
                    <div
                        className="flex-1 rounded-xl px-3.5 py-2.5"
                        style={{ background: `${accent}0d`, border: `1px solid ${accent}22` }}
                    >
                        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-0.5">
                            Est. per sale
                        </p>
                        <p className="font-mono text-lg font-bold leading-none" style={{ color: accent }}>
                            {p.avg_earning_per_sale.toLocaleString()}
                            <span className="text-[11px] font-medium text-stone-400 ml-1">{p.currency ?? "RWF"}</span>
                        </p>
                    </div>

                    <div className="flex-1 rounded-xl px-3.5 py-2.5 bg-stone-50 dark:bg-white/4 border border-black/[0.06] dark:border-white/[0.06]">
                        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-0.5">
                            Engagement
                        </p>
                        <p className="font-mono text-lg font-bold text-[#1a1714] dark:text-white leading-none">
                            {formatNumber(p.engagement ?? 0)}
                        </p>
                    </div>
                </div>

                {/* Rate bar */}
                <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">Commission rate</span>
                    <span className="text-[10px] font-bold" style={{ color: accent }}>{p.commission_rate}%</span>
                </div>
                <div className="h-1 rounded-full bg-stone-100 dark:bg-white/8 overflow-hidden mb-4">
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, p.commission_rate * 3.3)}%`, background: accent }}
                    />
                </div>

                {/* CTA */}
                <CardShell.PrimaryButton icon={<ArrowIcon />}>
                    Promote Now
                </CardShell.PrimaryButton>

                {/* Quick actions */}
                {showQuickActions && (
                    <CardShell.Actions className="mt-2">
                        <CardShell.ActionButton onClick={handleCopyLink} icon={<IconLink />} hoverColor="orange">
                            Copy link
                        </CardShell.ActionButton>
                        <CardShell.ActionButton href={`/marketplace/${p.slug}`} icon={<IconShare />} hoverColor="indigo">
                            Preview
                        </CardShell.ActionButton>
                    </CardShell.Actions>
                )}
            </CardShell.Body>
        </CardShell>
    );
}