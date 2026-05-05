"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShoppingBag, Users, DollarSign,
    ArrowRight, ChevronRight, Star, Shield,
    Globe, Package, Store, TrendingUp, CheckCircle,
    Zap, MapPin, Tag, BarChart3, Award, Wallet,
    Layers, Search, Heart, ExternalLink,
    Clapperboard,
} from "lucide-react";
import { Hero } from "./hero";
import { SharedCampaignCard, SharedCampaignRow } from "../ugc/campaign-card-shared";
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

/* ─── Types ─── */
interface Campaign { id: string; title: string; campaign_type?: string; rate_per_1k_views?: number; slug?: string; }
interface Community { id: string; name: string; member_count?: number; avatar_url?: string; slug?: string; }
interface HomepageRedesignProps {
    campaigns?: SharedCampaignRow[];
    communities?: Community[];
    stats?: { users: string; earned: string; secure: string; countries: string; };
}

/* ═══════════════════════════════════════════════
   TICKER
═══════════════════════════════════════════════ */
function Ticker() {
    const items = [
        "✦ Global Marketplace", "✦ Verified Vendors", "✦ Earn Commissions",
        "✦ Join Communities", "✦ Free to Start", "✦ Instant Payouts",
        "✦ 50+ Countries", "✦ 10,000+ Creators",
    ];
    const doubled = [...items, ...items];
    return (
        <div className="overflow-hidden py-2.5" style={{ background: "var(--color-accent)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <motion.div
                className="flex gap-8 whitespace-nowrap"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
            >
                {doubled.map((item, i) => (
                    <span key={i} className="text-white text-[11px] font-bold uppercase tracking-widest shrink-0">{item}</span>
                ))}
            </motion.div>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   MARKETPLACE PRODUCT CARD — used inside Hero
═══════════════════════════════════════════════ */
const HERO_PRODUCTS = [
    { id: 1, name: "Premium Skincare Bundle", price: "$48", badge: "Trending", stars: 4.9, reviews: 312, sold: "1.2k sold", color: "#fd5000", bg: "rgba(253,80,0,0.08)", emoji: "🧴" },
    { id: 2, name: "Wireless Earbuds Pro", price: "$129", badge: "Top Pick", stars: 4.8, reviews: 896, sold: "3.5k sold", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", emoji: "🎧" },
    { id: 3, name: "Handmade Leather Bag", price: "$85", badge: "Local Made", stars: 5.0, reviews: 144, sold: "680 sold", color: "#fd5000", bg: "rgba(253,80,0,0.08)", emoji: "👜" },
    { id: 4, name: "Smart Fitness Tracker", price: "$64", badge: "New", stars: 4.7, reviews: 207, sold: "920 sold", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", emoji: "⌚" },
    { id: 5, name: "African Print Fabric", price: "$22", badge: "Bestseller", stars: 4.9, reviews: 531, sold: "2.1k sold", color: "#fd5000", bg: "rgba(253,80,0,0.08)", emoji: "🎨" },
    { id: 6, name: "Home Diffuser Set", price: "$39", badge: "Popular", stars: 4.8, reviews: 188, sold: "740 sold", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", emoji: "🏺" },
];

function StarRow({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} width="10" height="10" viewBox="0 0 10 10">
                    <polygon
                        points="5,0.5 6.5,3.5 9.5,4 7.2,6.2 7.7,9.2 5,7.7 2.3,9.2 2.8,6.2 0.5,4 3.5,3.5"
                        fill={s <= Math.round(rating) ? "#fd5000" : "rgba(253,80,0,0.2)"}
                    />
                </svg>
            ))}
        </div>
    );
}

function ProductCard({ p, index }: { p: typeof HERO_PRODUCTS[0]; index: number }) {
    const [wishlisted, setWishlisted] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="group relative rounded-2xl overflow-hidden flex flex-col"
            style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                transition: "border-color 0.2s, transform 0.2s",
            }}
            whileHover={{ y: -3 }}
        >
            {/* Product image area */}
            <div
                className="relative flex items-center justify-center"
                style={{
                    background: p.bg,
                    height: "120px",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <span style={{ fontSize: "42px", lineHeight: 1 }}>{p.emoji}</span>

                {/* Badge */}
                <div
                    className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide"
                    style={{ background: p.color, color: "#fff" }}
                >
                    {p.badge}
                </div>

                {/* Wishlist */}
                <button
                    onClick={() => setWishlisted(w => !w)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                    <Heart
                        className="h-3 w-3"
                        style={{ fill: wishlisted ? "#fd5000" : "none", color: wishlisted ? "#fd5000" : "var(--color-text-muted)" }}
                    />
                </button>
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-1.5 flex-1">
                <p className="text-xs font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
                    {p.name}
                </p>
                <div className="flex items-center gap-1.5">
                    <StarRow rating={p.stars} />
                    <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>({p.reviews})</span>
                </div>
                <div className="flex items-center justify-between mt-auto pt-1.5" style={{ borderTop: "1px solid var(--color-border)" }}>
                    <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>{p.price}</span>
                    <span className="text-[9px] font-semibold" style={{ color: "var(--color-text-muted)" }}>{p.sold}</span>
                </div>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════
   UGC CAMPAIGNS
═══════════════════════════════════════════════ */
function UGCCampaigns({ campaigns = [] }: { campaigns: SharedCampaignRow[] }) {
    const demo: Campaign[] = campaigns.length > 0 ? campaigns : [
        { id: "1", title: "Summer Skincare Review", campaign_type: "UGC", rate_per_1k_views: 8, slug: "skincare-review" },
        { id: "2", title: "Tech Unboxing Series", campaign_type: "Clipping", rate_per_1k_views: 12, slug: "tech-unbox" },
        { id: "3", title: "Fashion Haul Africa", campaign_type: "UGC", rate_per_1k_views: 6, slug: "fashion-haul" },
        { id: "4", title: "Fitness Transformation", campaign_type: "Clipping", rate_per_1k_views: 10, slug: "fitness" },
        { id: "5", title: "Home Setup Tour", campaign_type: "UGC", rate_per_1k_views: 7, slug: "home-setup" },
        { id: "6", title: "Food & Lifestyle Clips", campaign_type: "Clipping", rate_per_1k_views: 9, slug: "food-clips" },
    ];

    const typeColor = (type?: string) =>
        type === "Clipping"
            ? { bg: "rgba(14,165,233,0.1)", color: "#0ea5e9", border: "rgba(14,165,233,0.2)" }
            : { bg: "rgba(253,80,0,0.08)", color: "var(--color-accent)", border: "rgba(253,80,0,0.15)" };

    return (
        <section
            className="py-20 sm:py-28"
            style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
        >
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

                    {/* Header */}
                    <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end mb-12">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] font-bold uppercase tracking-widest"
                                style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.18)", color: "var(--color-accent)" }}>
                                <Clapperboard className="h-3 w-3" />
                                UGC &amp; Clipping campaigns
                            </div>
                            <h2
                                className="font-black tracking-tight mb-4"
                                style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}
                            >
                                Get paid to create content.<br />
                                <span style={{ color: "var(--color-accent)" }}>No followers needed.</span>
                            </h2>
                            <p className="text-base max-w-lg" style={{ color: "var(--color-text-muted)" }}>
                                Join a brand campaign, film or clip content, and earn per 1,000 views — on any platform. It's that simple.
                            </p>
                        </div>

                        {/* Stats pill */}
                        <div
                            className="flex flex-col gap-4 p-5 rounded-2xl shrink-0 w-full lg:w-56"
                            style={{ background: "rgba(253,80,0,0.05)", border: "1px solid rgba(253,80,0,0.15)" }}
                        >
                            {[
                                { label: "Avg. per 1K views", value: "$8" },
                                { label: "Active campaigns", value: "120+" },
                                { label: "Platforms accepted", value: "Any" },
                            ].map(row => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
                                    <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Campaign cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {demo.map((c) => {
                            const tc = typeColor(c.campaign_type);
                            return (
                                <motion.div key={c.id} variants={fadeUp}>
                                    <SharedCampaignCard c={c as any} />
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Bottom CTA */}
                    <motion.div variants={fadeUp} className="flex justify-center mt-9">
                        <Link
                            href="/ugc"
                            className="inline-flex items-center gap-2.5 h-12 px-8 rounded-2xl text-sm font-bold text-white"
                            style={{ background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Browse all campaigns <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>

                </motion.div>
            </div>
        </section>
    );
}

function CorePillars() {
    const pillars = [
        {
            icon: ShoppingBag,
            title: "Marketplace",
            tagline: "Buy & Sell Globally",
            desc: "Thousands of verified products from trusted vendors. Shop or list your own — reach customers across 50+ countries.",
            href: "/marketplace",
            cta: "Explore products",
            accent: "#fd5000", bg: "rgba(253,80,0,0.06)", border: "rgba(253,80,0,0.15)",
            features: ["Verified vendors", "Secure checkout", "Global shipping"],
            badge: null,
        },
        {
            icon: DollarSign,
            title: "Earn (Affiliate)",
            tagline: "Earn While You Sleep",
            desc: "Promote any product and earn up to 30% commission on every sale. No inventory, no hassle — just share and earn.",
            href: "/affiliate",
            cta: "Start earning free",
            accent: "#fd5000", bg: "rgba(253,80,0,0.06)", border: "rgba(253,80,0,0.15)",
            features: ["Up to 30% commission", "Real-time tracking", "Instant withdrawals"],
            badge: null,
        },
        {
            icon: Clapperboard,
            title: "Campaigns",
            tagline: "UGC & Clipping",
            desc: "Join brand campaigns, create short-form content, and get paid per view. No followers required — just create.",
            href: "/ugc",
            cta: "Join a campaign",
            accent: "#fd5000", bg: "rgba(253,80,0,0.06)", border: "rgba(253,80,0,0.15)",
            features: ["Paid per 1K views", "Brand partnerships", "Any platform"],
            badge: "🔥 Hot",
        },
        {
            icon: Users,
            title: "Communities",
            tagline: "Connect & Grow",
            desc: "Find your niche. Join communities of buyers, sellers, and creators who share your interests and goals.",
            href: "/communities",
            cta: "Discover communities",
            accent: "#fd5000", bg: "rgba(253,80,0,0.06)", border: "rgba(253,80,0,0.15)",
            features: ["Niche communities", "Peer networking", "Group deals"],
            badge: null,
        },
    ];

    return (
        <section
            className="py-20 sm:py-28"
            style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}
        >
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div
                    initial="hidden" whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={stagger}
                >
                    <motion.div variants={fadeUp} className="text-center mb-14">
                        <p
                            className="text-[11px] font-bold uppercase tracking-widest mb-3"
                            style={{ color: "var(--color-accent)" }}
                        >
                            Built for growth
                        </p>
                        <h2
                            className="font-black tracking-tight mb-4"
                            style={{
                                fontSize: "clamp(2rem, 4vw, 3rem)",
                                color: "var(--color-text-primary)",
                                letterSpacing: "-0.03em",
                            }}
                        >
                            Four ways to succeed on Jimvio
                        </h2>
                        <p className="text-base max-w-xl mx-auto" style={{ color: "var(--color-text-muted)" }}>
                            Whether you're a buyer, seller, creator, or affiliate — the platform is built to maximize your results.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {pillars.map((p) => (
                            <motion.div key={p.title} variants={fadeUp} className="relative">
                                {/* Hot badge */}
                                {p.badge && (
                                    <div
                                        className="absolute -top-3 left-5 z-10 px-3 py-1 rounded-full text-[10px] font-bold text-white"
                                        style={{ background: p.accent, boxShadow: `0 4px 12px ${p.accent}40` }}
                                    >
                                        {p.badge}
                                    </div>
                                )}

                                <Link
                                    href={p.href}
                                    className="group flex flex-col h-full p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1"
                                    style={{ background: "var(--color-bg)", border: `1px solid var(--color-border)` }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = p.border)}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    {/* Icon */}
                                    <div
                                        className="h-12 w-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-105"
                                        style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.accent }}
                                    >
                                        <p.icon className="h-5 w-5" />
                                    </div>

                                    {/* Tagline */}
                                    <p
                                        className="text-[10px] font-bold uppercase tracking-widest mb-1"
                                        style={{ color: p.accent }}
                                    >
                                        {p.tagline}
                                    </p>

                                    {/* Title */}
                                    <h3
                                        className="text-lg font-black mb-2.5"
                                        style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
                                    >
                                        {p.title}
                                    </h3>

                                    {/* Description */}
                                    <p
                                        className="text-xs leading-relaxed mb-5 flex-1"
                                        style={{ color: "var(--color-text-muted)" }}
                                    >
                                        {p.desc}
                                    </p>

                                    {/* Features */}
                                    <ul className="space-y-1.5 mb-6">
                                        {p.features.map(f => (
                                            <li key={f} className="flex items-center gap-2">
                                                <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: p.accent }} />
                                                <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                                                    {f}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA */}
                                    <div
                                        className="flex items-center gap-1.5 text-xs font-bold transition-all group-hover:gap-2.5"
                                        style={{ color: p.accent }}
                                    >
                                        {p.cta} <ArrowRight className="h-3.5 w-3.5" />
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
/* ═══════════════════════════════════════════════
   CATEGORY BROWSE
═══════════════════════════════════════════════ */
function CategoryBrowse() {
    const cats = [
        { name: "Electronics", count: "2.4K+", icon: Zap, },
        { name: "Fashion", count: "5.1K+", icon: Tag, },
        { name: "Home & Living", count: "1.8K+", icon: Layers, },
        { name: "Health", count: "890+", icon: Heart, },
        { name: "Business", count: "1.2K+", icon: BarChart3, },
        { name: "Local Vendors", count: "640+", icon: MapPin, },
    ];

    return (
        <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>Product categories</p>
                            <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
                                Browse by category
                            </h2>
                        </div>
                        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0" style={{ color: "var(--color-accent)" }}>
                            View all products <ChevronRight className="h-4 w-4" />
                        </Link>
                    </motion.div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {cats.map((cat) => (
                            <motion.div key={cat.name} variants={fadeUp}>
                                <Link
                                    href={`/marketplace?category=${cat.name.toLowerCase().replace(/ /g, "-")}`}
                                    className="group flex flex-col items-center text-center p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.3)")}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    <div
                                        className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                                        style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)" }}
                                    >
                                        <cat.icon className="h-5 w-5" />
                                    </div>
                                    <p className="text-xs font-bold mb-1 leading-tight" style={{ color: "var(--color-text-primary)" }}>{cat.name}</p>
                                    <p className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>{cat.count} items</p>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   AFFILIATE SPOTLIGHT
═══════════════════════════════════════════════ */
function AffiliateSpotlight({ campaigns = [] }: { campaigns: Campaign[] }) {
    const demo: Campaign[] = campaigns.length > 0 ? campaigns : [
        { id: "1", title: "Premium Skincare Bundle", campaign_type: "Affiliate", rate_per_1k_views: 18, slug: "skincare" },
        { id: "2", title: "Wireless Tech Accessories", campaign_type: "Affiliate", rate_per_1k_views: 24, slug: "tech-acc" },
        { id: "3", title: "Fashion Haul Collection", campaign_type: "Affiliate", rate_per_1k_views: 12, slug: "fashion" },
        { id: "4", title: "Home Decor Essentials", campaign_type: "Affiliate", rate_per_1k_views: 15, slug: "home" },
    ];
    return (
        <section
            className="py-20 sm:py-28"
            style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
        >
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end mb-12">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>Affiliate program</p>
                            <h2 className="font-black tracking-tight mb-4" style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}>
                                Earn commissions on<br />every product you share
                            </h2>
                            <p className="text-base max-w-lg" style={{ color: "var(--color-text-muted)" }}>
                                Get your unique affiliate link. Share anywhere. Earn up to 30% on every purchase your referral makes — automatically.
                            </p>
                        </div>
                        <div
                            className="flex flex-col gap-4 p-5 rounded-2xl shrink-0 w-full lg:w-56"
                            style={{ background: "rgba(253,80,0,0.05)", border: "1px solid rgba(253,80,0,0.15)" }}
                        >
                            {[
                                { label: "Avg. commission", value: "22%" },
                                { label: "Top earner / mo", value: "$4.2K" },
                                { label: "Payout delay", value: "Same day" },
                            ].map(row => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
                                    <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {demo.map((c, i) => (
                            <motion.div key={c.id} variants={fadeUp}>
                                <Link
                                    href={`/affiliate/${c.slug ?? c.id}`}
                                    className="group flex flex-col gap-4 p-5 rounded-2xl h-full transition-all duration-200 hover:-translate-y-0.5"
                                    style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.25)")}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)" }}>
                                        <Package className="h-4.5 w-4.5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold mb-1.5 leading-snug" style={{ color: "var(--color-text-primary)" }}>{c.title}</p>
                                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide" style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)" }}>
                                            {c.campaign_type ?? "Affiliate"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Commission</p>
                                            <p className="text-lg font-black" style={{ color: "var(--color-accent)" }}>{c.rate_per_1k_views ?? 15}%</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold transition-all group-hover:gap-2.5" style={{ color: "var(--color-accent)" }}>
                                            Get link <ExternalLink className="h-3.5 w-3.5" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div variants={fadeUp} className="flex justify-center mt-9">
                        <Link
                            href="/affiliate"
                            className="inline-flex items-center gap-2.5 h-12 px-8 rounded-2xl text-sm font-bold text-white"
                            style={{ background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Browse all affiliate products <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   COMMUNITIES
═══════════════════════════════════════════════ */
function CommunitiesSection({ communities = [] }: { communities: Community[] }) {
    const demo: Community[] = communities.length > 0 ? communities : [
        { id: "1", name: "African Fashion Creators", member_count: 8420, slug: "african-fashion" },
        { id: "2", name: "Tech & Gadgets RW", member_count: 12300, slug: "tech-gadgets" },
        { id: "3", name: "Business & Ecom Hub", member_count: 5670, slug: "business-hub" },
        { id: "4", name: "Fitness & Wellness", member_count: 3200, slug: "fitness" },
        { id: "5", name: "Food & Recipes Africa", member_count: 7100, slug: "food" },
        { id: "6", name: "Freelancers Network", member_count: 4400, slug: "freelancers" },
    ];

    return (
        <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>Find your people</p>
                            <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
                                Popular Communities
                            </h2>
                        </div>
                        <Link href="/communities" className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0" style={{ color: "var(--color-accent)" }}>
                            See all <ChevronRight className="h-4 w-4" />
                        </Link>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {demo.map((c, i) => (
                            <motion.div key={c.id} variants={fadeUp}>
                                <Link
                                    href={`/communities/${c.slug ?? c.id}`}
                                    className="group flex items-center gap-4 p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.25)")}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                                >
                                    <div
                                        className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shrink-0"
                                        style={{ background: "var(--color-accent)" }}
                                    >
                                        {c.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold mb-0.5 truncate" style={{ color: "var(--color-text-primary)" }}>{c.name}</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                                {(c.member_count ?? 0).toLocaleString()} members
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold"
                                        style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)", border: "1px solid rgba(253,80,0,0.18)" }}
                                    >
                                        Join
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   HOW IT WORKS
═══════════════════════════════════════════════ */
function HowItWorks() {
    const steps = [
        { num: "01", icon: Users, title: "Create your free account", desc: "Sign up in 60 seconds. No credit card required." },
        { num: "02", icon: Search, title: "Pick your path", desc: "Sell products, become an affiliate, or join communities." },
        { num: "03", icon: Store, title: "List or promote", desc: "Add your own products or share links to earn commissions." },
        { num: "04", icon: Wallet, title: "Get paid", desc: "Withdraw earnings directly to your account, any time." },
    ];

    return (
        <section className="py-20 sm:py-28" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="text-center mb-14">
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>Simple to start</p>
                        <h2 className="font-black tracking-tight mb-3" style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)", color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}>
                            From zero to earning<br />in 4 steps
                        </h2>
                        <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>No experience needed. Built for anyone ready to grow online.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {steps.map((step, i) => (
                            <motion.div key={step.num} variants={fadeUp}>
                                <div className="relative flex flex-col p-6 rounded-2xl h-full" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                                    <div className="absolute top-4 right-4 text-5xl font-black leading-none select-none" style={{ color: "rgba(253,80,0,0.07)" }}>
                                        {step.num}
                                    </div>
                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-5 z-10" style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.15)", color: "var(--color-accent)" }}>
                                        <step.icon className="h-5 w-5" />
                                    </div>
                                    <p className="text-base font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{step.title}</p>
                                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{step.desc}</p>
                                    {i < steps.length - 1 && (
                                        <div className="hidden lg:block absolute top-1/2 -right-3 h-2 w-2 rounded-full -translate-y-1/2 z-20" style={{ background: "var(--color-border-strong)" }} />
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div variants={fadeUp} className="flex justify-center mt-10">
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2.5 px-9 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                            style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Get started free <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   TRUST / STATS
═══════════════════════════════════════════════ */
function TrustSection({ stats }: { stats?: HomepageRedesignProps["stats"] }) {
    const s = stats ?? { users: "10K+", earned: "$1M+", secure: "99.9%", countries: "50+" };
    const items = [
        { value: s.users, label: "Active users", icon: Users, sub: "and growing daily" },
        { value: s.earned, label: "Total paid out", icon: DollarSign, sub: "to creators & sellers" },
        { value: s.secure, label: "Platform uptime", icon: Shield, sub: "always available" },
        { value: s.countries, label: "Countries", icon: Globe, sub: "worldwide reach" },
    ];

    return (
        <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp} className="text-center mb-14">
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>By the numbers</p>
                        <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}>
                            Trusted by thousands globally
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {items.map(item => (
                            <motion.div key={item.label} variants={fadeUp}>
                                <div className="flex flex-col items-center text-center p-7 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.15)", color: "var(--color-accent)" }}>
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <p className="font-black mb-1" style={{ fontSize: "clamp(2rem, 3vw, 2.75rem)", color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>{item.value}</p>
                                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>{item.label}</p>
                                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{item.sub}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   VENDOR BANNER
═══════════════════════════════════════════════ */
function VendorBanner() {
    return (
        <section className="py-16 sm:py-20" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div
                        variants={fadeUp}
                        className="relative overflow-hidden rounded-3xl p-8 sm:p-12"
                        style={{
                            background: "linear-gradient(135deg, #0d0600 0%, #1a0800 50%, #0d0600 100%)",
                            border: "1px solid rgba(253,80,0,0.2)",
                        }}
                    >
                        <div className="absolute top-0 right-0 w-[400px] h-[300px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(253,80,0,0.15) 0%, transparent 60%)" }} />
                        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                            backgroundImage: "linear-gradient(rgba(253,80,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(253,80,0,0.6) 1px, transparent 1px)",
                            backgroundSize: "40px 40px",
                        }} />
                        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
                            <div>
                                <div className="flex items-center gap-2.5 mb-5">
                                    <Award className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
                                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>For vendors & sellers</span>
                                </div>
                                <h2 className="font-black text-white tracking-tight mb-4" style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", letterSpacing: "-0.025em" }}>
                                    Ready to reach your<br /><span style={{ color: "var(--color-accent)" }}>first 1,000 customers?</span>
                                </h2>
                                <p className="text-white/60 text-base max-w-lg">
                                    List your products for free. Access our global network of buyers, affiliates and communities ready to share your brand.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 shrink-0">
                                <Link
                                    href="/vendor/register"
                                    className="inline-flex items-center justify-center gap-2.5 px-8 rounded-2xl text-sm font-bold text-white transition-all"
                                    style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.4)" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                                >
                                    Open your store <Store className="h-4 w-4" />
                                </Link>
                                <Link
                                    href="/marketplace"
                                    className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-2xl text-sm font-semibold text-white/70 border border-white/10 hover:border-white/25 transition-all"
                                >
                                    Browse marketplace
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   FINAL CTA
═══════════════════════════════════════════════ */
function FinalCTA() {
    return (
        <section className="py-24 sm:py-32" style={{ background: "var(--color-bg)" }}>
            <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
                    <motion.div variants={fadeUp}>
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 text-xs font-bold"
                            style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.18)", color: "var(--color-accent)" }}
                        >
                            <Star className="h-3.5 w-3.5" />
                            Free forever — no credit card needed
                        </div>
                    </motion.div>

                    <motion.h2
                        variants={fadeUp}
                        className="font-black tracking-tight mb-5"
                        style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", color: "var(--color-text-primary)", letterSpacing: "-0.035em", lineHeight: 1.05 }}
                    >
                        Your growth starts<br /><span style={{ color: "var(--color-accent)" }}>today.</span>
                    </motion.h2>

                    <motion.p variants={fadeUp} className="text-base leading-relaxed mb-10 max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
                        Thousands of vendors and affiliates already growing on Jimvio. Join for free and see the difference.
                    </motion.p>

                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/register"
                            className="group inline-flex items-center justify-center gap-2.5 px-10 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97]"
                            style={{ height: "56px", background: "var(--color-accent)", boxShadow: "0 10px 32px rgba(253,80,0,0.32)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                            Create Free Account
                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            href="/marketplace"
                            className="inline-flex items-center justify-center gap-2 px-8 rounded-2xl text-base font-semibold transition-all"
                            style={{ height: "56px", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                        >
                            Explore first
                        </Link>
                    </motion.div>

                    <motion.div variants={fadeUp} className="flex items-center justify-center gap-6 mt-10 flex-wrap">
                        {[
                            { icon: CheckCircle, label: "No setup fees" },
                            { icon: Shield, label: "Secure & private" },
                            { icon: Globe, label: "Works globally" },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
                                <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════
   ROOT EXPORT
═══════════════════════════════════════════════ */
export function HomepageRedesign({ campaigns = [], communities = [], stats }: HomepageRedesignProps) {
    return (
        <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
            <Ticker />
            <Hero />
            <CorePillars />
            <CategoryBrowse />
            <UGCCampaigns campaigns={campaigns} />
            <AffiliateSpotlight campaigns={campaigns} />
            <CommunitiesSection communities={communities} />
            <HowItWorks />
            <TrustSection stats={stats} />
            <VendorBanner />
            <FinalCTA />
        </div>
    );
}