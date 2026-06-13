"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, CheckCircle, Globe, Package, Video, ShoppingBag, Users, Star, TrendingUp, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

/* ─── Animation variants ─────────────────────────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
export const stagger = { show: { transition: { staggerChildren: 0.08 } } };

/* ─── FloatingHeroVisual ─────────────────────────────────────────────────── */

interface HeroData {
    product: { name: string; slug: string; price: string; saleCount: number; rating: number; image: string | null } | null;
    campaign: { title: string; id: string; rate: string; type: string } | null;
    sale: { amount: string; timeAgo: string };
    community: { name: string; slug: string; memberCount: string; avatar: string | null } | null;
    stats: { totalUsers: string };
}

function Shimmer({ className }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded ${className}`}
            style={{ background: "var(--color-border)" }}
        />
    );
}

export function FloatingHeroVisual() {
    const [data, setData] = useState<HeroData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/hero-data")
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (!cancelled && d) { setData(d); setLoading(false); } })
            .catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const product = data?.product;
    const campaign = data?.campaign;
    const sale = data?.sale ?? { amount: "$24", timeAgo: "just now" };
    const community = data?.community;
    const totalUsers = data?.stats?.totalUsers ?? "10K+";

    return (
        <div className="relative w-full h-[520px] select-none">

            {/* ── Background scaffold: subtle, asymmetric, not a circle ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Large soft blob, off-center */}
                <div
                    className="absolute opacity-[0.12]"
                    style={{
                        width: 420, height: 420,
                        top: -40, right: -60,
                        background: "radial-gradient(circle, #fd5000 0%, transparent 70%)",
                        filter: "blur(40px)",
                    }}
                />
                {/* Secondary smaller blob, different position */}
                <div
                    className="absolute opacity-[0.08]"
                    style={{
                        width: 280, height: 280,
                        bottom: 20, left: 10,
                        background: "radial-gradient(circle, #facc15 0%, transparent 70%)",
                        filter: "blur(36px)",
                    }}
                />
                {/* Fine grid texture, fades toward edges */}
                <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }}>
                    <defs>
                        <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--color-text-primary)" strokeWidth="1" />
                        </pattern>
                        <radialGradient id="hero-grid-fade" cx="50%" cy="45%" r="60%">
                            <stop offset="0%" stopColor="white" stopOpacity="1" />
                            <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </radialGradient>
                        <mask id="hero-grid-mask">
                            <rect width="100%" height="100%" fill="url(#hero-grid-fade)" />
                        </mask>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hero-grid)" mask="url(#hero-grid-mask)" />
                </svg>
            </div>

            {/* ── Anchor: large product showcase card (top area, slight tilt) ── */}
            <motion.div
                initial={{ opacity: 0, y: -16, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: -2 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="absolute z-20 top-[4%] left-[6%] right-[18%]"
            >
                <Link
                    href={product ? `/products/${product.slug}` : "/marketplace"}
                    className="group flex items-center gap-4 p-4 rounded-3xl transition-transform hover:rotate-0 hover:scale-[1.015] active:scale-[0.99]"
                    style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        boxShadow: "0 20px 50px -12px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.06)",
                        transition: "transform 0.4s ease",
                    }}
                >
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)" }}
                    >
                        {product?.image ? (
                            <img src={product.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Package size={26} style={{ color: "#0ea5e9" }} />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        {loading ? (
                            <>
                                <Shimmer className="w-36 h-3.5 mb-2" />
                                <Shimmer className="w-20 h-3" />
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                        style={{ background: "rgba(14,165,233,0.1)", color: "#0ea5e9" }}>
                                        Trending
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Star size={10} fill="#f59e0b" stroke="none" />
                                        <span className="text-[10px] font-bold" style={{ color: "var(--color-text-muted)" }}>
                                            {product?.rating?.toFixed(1) ?? "4.5"}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[13px] font-bold truncate leading-tight mb-1" style={{ color: "var(--color-text-primary)" }}>
                                    {product?.name ?? "Top Product"}
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[15px] font-black" style={{ color: "var(--color-text-primary)" }}>{product?.price ?? "—"}</span>
                                    <span className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                                        {product?.saleCount ? `${product.saleCount.toLocaleString()} sold` : "Top seller"}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    <ArrowRight size={16} className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: "var(--color-text-primary)" }} />
                </Link>
            </motion.div>

            {/* ── Central focal point: Jimvio mark, recessed into the layout, not floating in a void ── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="absolute z-10 top-[34%] left-[30%]"
            >
                <div className="flex flex-col items-center">
                    <div
                        className="w-[88px] h-[88px] rounded-[1.5rem] flex items-center justify-center"
                        style={{
                            background: "linear-gradient(145deg, #fd5000, #ff8a3d)",
                            boxShadow: "0 16px 32px -8px rgba(253,80,0,0.35)",
                        }}
                    >
                        <ShoppingBag size={36} strokeWidth={1.8} color="#fff" />
                    </div>
                    <div className="mt-3 text-center">
                        <p className="text-[13px] font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>Jimvio</p>
                        {loading ? (
                            <Shimmer className="w-16 h-2.5 mt-1.5 mx-auto" />
                        ) : (
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--color-text-muted)" }}>{totalUsers} creators</p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* ── Live campaign: narrower vertical card, right edge ── */}
            <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
                transition={{ opacity: { duration: 0.6, delay: 0.25 }, x: { duration: 0.6, delay: 0.25 }, y: { repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 } }}
                className="absolute z-20 top-[28%] right-[2%] w-[168px]"
            >
                <Link
                    href={campaign ? `/ugc/${campaign.id}` : "/ugc"}
                    className="block p-3.5 rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.99]"
                    style={{
                        background: "var(--color-text-primary)",
                        boxShadow: "0 16px 40px -10px rgba(0,0,0,0.25)",
                    }}
                >
                    <div className="flex items-center justify-between mb-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(253,80,0,0.18)", color: "#fd5000" }}>
                            <Video size={14} strokeWidth={2} />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--color-bg)" }}>Live</span>
                        </div>
                    </div>
                    {loading ? (
                        <>
                            <Shimmer className="w-20 h-2.5 mb-1.5" />
                            <Shimmer className="w-14 h-4" />
                        </>
                    ) : (
                        <>
                            <p className="text-[10px] font-medium mb-1 leading-snug" style={{ color: "rgba(255,255,255,0.55)" }}>
                                {campaign?.type ?? "UGC"} campaign
                            </p>
                            <p className="text-[12px] font-bold truncate mb-2" style={{ color: "var(--color-bg)" }}>
                                {campaign?.title ?? "Live Campaign"}
                            </p>
                            <p className="text-[15px] font-black" style={{ color: "#ff8a3d" }}>
                                {campaign?.rate ?? "Paid per view"}
                            </p>
                        </>
                    )}
                </Link>
            </motion.div>

            {/* ── Community card: lower-left, grounded ── */}
            <motion.div
                initial={{ opacity: 0, y: 16, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 1.5 }}
                transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute z-20 bottom-[8%] left-[2%] w-[178px]"
            >
                <Link
                    href={community ? `/communities/${community.slug}` : "/communities"}
                    className="group block p-3.5 rounded-2xl transition-transform hover:rotate-0 hover:scale-[1.02] active:scale-[0.99]"
                    style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        boxShadow: "0 14px 36px -10px rgba(0,0,0,0.12)",
                    }}
                >
                    <div className="flex items-center gap-2.5 mb-2.5">
                        {community?.avatar ? (
                            <img
                                src={community.avatar}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                style={{ border: "2px solid rgba(253,80,0,0.15)" }}
                            />
                        ) : (
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: "rgba(253,80,0,0.08)", color: "#fd5000" }}
                            >
                                <Users size={15} strokeWidth={2} />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            {loading ? (
                                <>
                                    <Shimmer className="w-20 h-3 mb-1" />
                                    <Shimmer className="w-14 h-2.5" />
                                </>
                            ) : (
                                <>
                                    <p className="text-[11px] font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                                        {community?.name ?? "Creator Hub"}
                                    </p>
                                    <p className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                                        {community?.memberCount ?? "1K+"} members
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid var(--color-border)" }}>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
                            <span className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>Active now</span>
                        </div>
                        <Zap size={12} style={{ color: "#fd5000" }} />
                    </div>
                </Link>
            </motion.div>

            {/* ── Sale ticker: small horizontal strip, bottom-right, like a notification toast ── */}
            <motion.div
                initial={{ opacity: 0, y: 12, x: 12 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.5, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="absolute z-30 bottom-[26%] right-[6%]"
            >
                <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 1.5 }}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full"
                    style={{
                        background: "var(--color-surface)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        boxShadow: "0 12px 28px -8px rgba(34,197,94,0.18)",
                    }}
                >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                        <TrendingUp size={12} strokeWidth={2.4} />
                    </div>
                    {loading ? (
                        <Shimmer className="w-16 h-3" />
                    ) : (
                        <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>
                            New sale <span style={{ color: "#22c55e" }}>{sale.amount}</span>
                        </span>
                    )}
                </motion.div>
            </motion.div>

        </div>
    );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
export function Hero() {
    const [activeCount, setActiveCount] = useState(9200);
    const [currentWord, setCurrentWord] = useState(0);
    const words = ["Sell Products", "Build Audiences", "Earn Commissions", "Grow Globally"];
    const router = useRouter();

    useEffect(() => { setActiveCount(Math.floor(Math.random() * 3000) + 8200); }, []);
    useEffect(() => {
        const t = setInterval(() => setCurrentWord(w => (w + 1) % words.length), 2800);
        return () => clearInterval(t);
    }, []);

    const handleLive = () => router.push("/live-activities");

    // Cycling stats for the mobile pill — rotates through live tx, users, countries, total paid
    const mobileStats = [
        { label: "Live transactions", val: "$840 / min", dot: "#22c55e" },
        { label: "Active users", val: `${activeCount.toLocaleString()}`, dot: "#22c55e" },
        { label: "Countries", val: "50+", dot: "#fd5000" },
        { label: "Total paid", val: "$1M+", dot: "#fd5000" },
    ];
    const [mobileStatIdx, setMobileStatIdx] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setMobileStatIdx(i => (i + 1) % mobileStats.length), 2800);
        return () => clearInterval(t);
    }, []);

    return (
        <section className="relative overflow-visible pt-16 pb-24 sm:pt-24 sm:pb-32" style={{ background: "var(--color-bg)" }}>
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center, rgba(253,80,0,0.06) 0%, transparent 65%)" }} />

            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_540px] gap-12 xl:gap-20 items-center">

                    <motion.div initial="hidden" animate="show" variants={stagger} className="text-center lg:text-left">
                        {/* ── Active-now pill — always visible ── */}
                        <motion.div variants={fadeUp} className="flex justify-center lg:justify-start mb-7">
                            {/* Mobile: cycles through all four stats, tapping goes to live-activities */}
                            <div className="sm:hidden">
                                <button
                                    onClick={handleLive}
                                    className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold"
                                    style={{ background: "rgba(253,80,0,0.10)", border: "1px solid rgba(253,80,0,0.22)", color: "var(--color-accent)", boxShadow: "0 6px 16px rgba(253,80,0,0.08)" }}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ background: mobileStats[mobileStatIdx].dot }} />
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={mobileStatIdx}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                            className="flex items-center gap-1.5"
                                        >
                                            <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
                                                {mobileStats[mobileStatIdx].label}:
                                            </span>
                                            <span style={{ color: "var(--color-accent)", fontWeight: 800 }}>
                                                {mobileStats[mobileStatIdx].val}
                                            </span>
                                        </motion.span>
                                    </AnimatePresence>
                                    <ArrowRight size={10} className="opacity-50" />
                                </button>
                            </div>

                            {/* Desktop: shows the active-count pill + navigates on click */}
                            <button
                                onClick={handleLive}
                                className="hidden sm:inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold"
                                style={{ background: "rgba(253,80,0,0.10)", border: "1px solid rgba(253,80,0,0.22)", color: "var(--color-accent)", boxShadow: "0 8px 26px rgba(253,80,0,0.12)" }}
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {activeCount.toLocaleString()} people active now
                            </button>
                        </motion.div>

                        <motion.div variants={fadeUp} className="mb-5">
                            <h1 className="font-black leading-[1.05] tracking-tight"
                                style={{ fontSize: "clamp(2.8rem,5vw,4.4rem)", color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>
                                The platform to<br />
                                <span className="relative inline-block overflow-hidden" style={{ color: "var(--color-accent)" }}>
                                    <AnimatePresence mode="wait">
                                        <motion.span key={currentWord} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
                                            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }} className="block"
                                            style={{
                                                background: "linear-gradient(90deg,#fd5000,#facc15)",
                                                WebkitBackgroundClip: "text",
                                                WebkitTextFillColor: "transparent",
                                                display: "inline-block",
                                            }}
                                        >{words[currentWord]}</motion.span>
                                    </AnimatePresence>
                                </span>
                                <br /><span style={{ color: "var(--color-text-primary)" }}>Anywhere.</span>
                            </h1>
                        </motion.div>

                        <motion.p variants={fadeUp} className="text-base sm:text-lg leading-relaxed mb-9 max-w-[560px] mx-auto lg:mx-0"
                            style={{ color: "var(--color-text-muted)" }}>
                            Sell products. Promote offers. Create content. Build your community. Grow your audience — all in one place.
                        </motion.p>

                        {/* ── CTA group: single primary action + two low-weight secondary links ── */}
                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 justify-center lg:justify-start mb-10">
                            <Link href="/register"
                                className="group inline-flex items-center justify-center gap-2.5 px-8 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                                style={{ height: "52px", background: "var(--color-accent)", boxShadow: "0 10px 34px rgba(253,80,0,0.20)", paddingLeft: 22, paddingRight: 22, borderRadius: 14 }}
                                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}>
                                Start earning for Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </Link>

                            {/* Secondary actions: text-link style, low visual weight */}
                            <div className="flex items-center gap-5 justify-center lg:justify-start">
                                <Link href="/marketplace"
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                                    style={{ color: "var(--color-text-muted)" }}
                                    onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
                                    onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}>
                                    Browse Marketplace <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                                </Link>
                                <span style={{ width: 1, height: 16, background: "var(--color-border)" }} />
                                <Link href="/communities/create"
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                                    style={{ color: "var(--color-text-muted)" }}
                                    onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
                                    onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}>
                                    Create Community <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                                </Link>
                            </div>
                        </motion.div>

                        {/* ── Trust badges: neutral icon boxes, orange reserved for CTA + headline ── */}
                        <motion.div variants={fadeUp} className="flex items-center gap-6 flex-wrap justify-center lg:justify-start">
                            {[{ icon: Shield, label: "Secure Payments" }, { icon: CheckCircle, label: "Verified Vendors" }, { icon: Globe, label: "50+ Countries" }]
                                .map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-border)', opacity: 0.35 }}>
                                            <Icon className="h-4 w-4" style={{ color: "var(--color-text-muted)", opacity: 1 }} />
                                        </div>
                                        <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                                    </div>
                                ))}
                        </motion.div>
                    </motion.div>

                    {/* Visual column */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full hidden sm:block"
                        style={{ minHeight: 420, alignSelf: 'center' }}
                    >
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                            <FloatingHeroVisual />
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}