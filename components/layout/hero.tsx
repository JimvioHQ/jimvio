"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
    ArrowRight, Shield, CheckCircle, Globe, Package, Video, ShoppingBag,
    Users, Star, TrendingUp, Zap, Sparkles, Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { WORLD_LAND_DOTS } from "./hero-land-dots";

/* ─── Animation variants ─────────────────────────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
export const stagger = { show: { transition: { staggerChildren: 0.08 } } };

const JMV_ORANGE = "#fd5000";

const solidCard = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
} as const;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function useReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReduced(mq.matches);
        const handler = () => setReduced(mq.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return reduced;
}

function use3DTilt(strength = 10) {
    const ref = useRef<HTMLDivElement>(null);
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const sx = useSpring(mx, { stiffness: 160, damping: 22 });
    const sy = useSpring(my, { stiffness: 160, damping: 22 });
    const rotateX = useTransform(sy, [-0.5, 0.5], [strength, -strength]);
    const rotateY = useTransform(sx, [-0.5, 0.5], [-strength, strength]);
    const onMove = useCallback((e: React.MouseEvent) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
    }, [mx, my]);
    const onLeave = useCallback(() => { mx.set(0); my.set(0); }, [mx, my]);
    return { ref, rotateX, rotateY, onMove, onLeave };
}

function Shimmer({ className }: { className?: string }) {
    return <div className={`animate-pulse rounded ${className}`} style={{ background: "var(--color-border)" }} />;
}

function HeroBackground({ reduced }: { reduced: boolean }) {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <motion.div
                className="absolute -top-32 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
                style={{ background: "radial-gradient(ellipse, rgba(253,80,0,0.1) 0%, transparent 68%)" }}
                animate={reduced ? {} : { scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--color-border), transparent)" }} />
        </div>
    );
}

function Button3D({ href, children, className, style }: {
    href: string; children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
    const { ref, rotateX, rotateY, onMove, onLeave } = use3DTilt(10);
    return (
        <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="inline-flex" style={{ perspective: 600 }}>
            <Link href={href} className={className} style={style}>
                <motion.span className="relative flex h-full w-full items-center justify-center gap-2.5" style={{ rotateX, rotateY }} whileTap={{ scale: 0.97 }}>
                    {children}
                </motion.span>
            </Link>
        </div>
    );
}

/* ─── World-map orange globe (Natural Earth land dots) ───────────────────── */
function orthographicProject(
    lat: number,
    lng: number,
    cx: number,
    cy: number,
    r: number,
    centerLat: number,
    centerLng: number,
) {
    const latR = (lat * Math.PI) / 180;
    const lngR = (lng * Math.PI) / 180;
    const lat0 = (centerLat * Math.PI) / 180;
    const lng0 = (centerLng * Math.PI) / 180;
    const dLng = lngR - lng0;

    const cosLat = Math.cos(latR);
    const sinLat = Math.sin(latR);
    const cosLat0 = Math.cos(lat0);
    const sinLat0 = Math.sin(lat0);

    const x = cosLat * Math.sin(dLng);
    const y = cosLat0 * sinLat - sinLat0 * cosLat * Math.cos(dLng);
    const z = sinLat0 * sinLat + cosLat0 * cosLat * Math.cos(dLng);

    if (z < 0.05) return null;

    return {
        x: cx + x * r,
        y: cy - y * r,
        z,
        s: 1.1 + z * 1.4,
        o: 0.45 + z * 0.55,
    };
}

function HeroDotGlobe({ size = 380, reduced }: { size?: number; reduced: boolean }) {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.39;
    const [rotation, setRotation] = useState(15);
    const clipId = React.useId().replace(/:/g, "");

    useEffect(() => {
        if (reduced) return;
        const id = setInterval(() => setRotation(v => (v + 0.3) % 360), 90);
        return () => clearInterval(id);
    }, [reduced]);

    const dots = useMemo(() => {
        const centerLat = 12;
        const centerLng = rotation;
        return WORLD_LAND_DOTS
            .map(([lat, lng]) => orthographicProject(lat, lng, cx, cy, r, centerLat, centerLng))
            .filter(Boolean) as { x: number; y: number; z: number; s: number; o: number }[];
    }, [cx, cy, r, rotation]);

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(253,80,0,0.32) 0%, rgba(253,80,0,0.1) 45%, transparent 72%)",
                    transform: "scale(1.18)",
                }}
            />
            <div
                className="absolute rounded-full"
                style={{
                    width: r * 2.15, height: r * 2.15,
                    background: "radial-gradient(circle, rgba(253,80,0,0.2) 0%, transparent 70%)",
                    filter: "blur(10px)",
                }}
            />

            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                <g transform={`translate(${cx}, ${cy}) rotate(-18)`}>
                    <ellipse rx={r * 1.3} ry={r * 0.42} fill="none" stroke="rgba(253,80,0,0.22)" strokeWidth="1" />
                </g>
                <g transform={`translate(${cx}, ${cy}) rotate(24)`}>
                    <ellipse rx={r * 1.42} ry={r * 0.48} fill="none" stroke="rgba(253,80,0,0.14)" strokeWidth="1" strokeDasharray="6 8" />
                </g>
                <g transform={`translate(${cx}, ${cy}) rotate(-8)`}>
                    <ellipse rx={r * 1.2} ry={r * 0.36} fill="none" stroke="rgba(253,80,0,0.1)" strokeWidth="0.8" />
                </g>
            </svg>

            <motion.div
                className="relative overflow-hidden rounded-full"
                style={{
                    width: r * 2, height: r * 2,
                    background: "radial-gradient(circle at 32% 28%, rgba(255,170,90,0.95) 0%, rgba(253,80,0,0.78) 38%, rgba(210,60,0,0.88) 72%, rgba(160,45,0,0.92) 100%)",
                    boxShadow: "0 0 70px rgba(253,80,0,0.45), 0 0 130px rgba(253,80,0,0.18), inset 0 -28px 48px rgba(0,0,0,0.18), inset 0 18px 36px rgba(255,255,255,0.18)",
                }}
                animate={reduced ? {} : { y: [0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
                <div
                    className="pointer-events-none absolute rounded-full"
                    style={{
                        width: "46%", height: "32%", top: "9%", left: "13%",
                        background: "radial-gradient(ellipse, rgba(255,255,255,0.38) 0%, transparent 70%)",
                    }}
                />

                <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${size} ${size}`}>
                    <defs>
                        <clipPath id={clipId}>
                            <circle cx={cx} cy={cy} r={r * 0.98} />
                        </clipPath>
                    </defs>
                    <g clipPath={`url(#${clipId})`}>
                        {dots.map((d, i) => (
                            <circle
                                key={i}
                                cx={d.x}
                                cy={d.y}
                                r={d.s}
                                fill={`rgba(255,235,200,${d.o})`}
                            />
                        ))}
                    </g>
                </svg>

                <div
                    className="pointer-events-none absolute rounded-full"
                    style={{
                        width: "38%", height: "38%", top: "31%", left: "31%",
                        background: "radial-gradient(circle, rgba(255,210,120,0.28) 0%, transparent 70%)",
                    }}
                />
            </motion.div>
        </div>
    );
}

/* ─── Avatar ring around globe ───────────────────────────────────────────── */
const AVATAR_URLS = [
    "https://i.pravatar.cc/80?img=11",
    "https://i.pravatar.cc/80?img=32",
    "https://i.pravatar.cc/80?img=45",
    "https://i.pravatar.cc/80?img=49",
    "https://i.pravatar.cc/80?img=52",
    "https://i.pravatar.cc/80?img=60",
    "https://i.pravatar.cc/80?img=68",
];

function HeroAvatars({ reduced }: { reduced: boolean }) {
    const positions = [
        { top: "6%", left: "18%", online: true },
        { top: "12%", right: "12%", online: false },
        { top: "38%", left: "2%", online: true },
        { top: "55%", right: "4%", online: true },
        { bottom: "18%", left: "22%", online: false },
        { bottom: "8%", right: "20%", online: true },
        { top: "28%", right: "2%", online: false },
    ];

    return (
        <>
            {AVATAR_URLS.map((src, i) => {
                const pos = positions[i];
                return (
                    <motion.div
                        key={i}
                        className="absolute z-10"
                        style={pos}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1, y: reduced ? 0 : [0, -3, 0] }}
                        transition={{
                            opacity: { delay: 0.5 + i * 0.08, duration: 0.4 },
                            scale: { delay: 0.5 + i * 0.08, duration: 0.4 },
                            y: { duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 },
                        }}
                    >
                        <div className="relative">
                            <img
                                src={src}
                                alt=""
                                className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10"
                                style={{ border: "2px solid var(--color-surface)", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
                            />
                            {pos.online && (
                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" style={{ borderColor: "var(--color-surface)" }} />
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </>
    );
}

/* ─── FloatingHeroVisual ─────────────────────────────────────────────────── */
interface HeroData {
    product: { name: string; slug: string; price: string; saleCount: number; rating: number; image: string | null } | null;
    campaign: { title: string; id: string; rate: string; type: string } | null;
    sale: { amount: string; timeAgo: string };
    community: { name: string; slug: string; memberCount: string; avatar: string | null } | null;
    stats: { totalUsers: string };
}

export function FloatingHeroVisual() {
    const containerRef = useRef<HTMLDivElement>(null);
    const reduced = useReducedMotion();
    const [data, setData] = useState<HeroData | null>(null);
    const [loading, setLoading] = useState(true);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness: 55, damping: 18 });
    const springY = useSpring(mouseY, { stiffness: 55, damping: 18 });
    const rotateY = useTransform(springX, [-0.5, 0.5], reduced ? [0, 0] : [5, -5]);
    const rotateX = useTransform(springY, [-0.5, 0.5], reduced ? [0, 0] : [-4, 4]);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/hero-data")
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (!cancelled && d) { setData(d); setLoading(false); } })
            .catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
        mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    const product = data?.product;
    const campaign = data?.campaign;
    const sale = data?.sale ?? { amount: "$35.5K", timeAgo: "just now" };
    const community = data?.community;

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
            className="relative mx-auto h-[560px] w-full max-w-[580px] select-none"
            style={{ perspective: 1200 }}
        >
            <motion.div style={{ rotateY, rotateX, transformStyle: "preserve-3d" }} className="relative h-full w-full">
                <HeroAvatars reduced={reduced} />

                {/* Center globe */}
                <div className="absolute left-1/2 top-[46%] z-[5] -translate-x-1/2 -translate-y-1/2">
                    <HeroDotGlobe size={380} reduced={reduced} />
                </div>

                {/* Marketplace badge — left of globe */}
                <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="absolute left-[4%] top-[42%] z-20 text-center"
                >
                    <Link href="/marketplace" className="group block">
                        <div
                            className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                            style={{
                                background: `linear-gradient(145deg, ${JMV_ORANGE}, #ff7a30)`,
                                boxShadow: "0 16px 40px rgba(253,80,0,0.4)",
                            }}
                        >
                            <ShoppingBag size={32} strokeWidth={1.6} color="#fff" />
                        </div>
                        <p className="mt-2 text-[11px] font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
                            Jimvio<br />Marketplace
                        </p>
                    </Link>
                </motion.div>

                {/* Product card — top right */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="absolute right-0 top-[2%] z-20 w-[230px]"
                >
                    <Link href={product ? `/products/${product.slug}` : "/marketplace"} className="group block rounded-2xl p-3.5 transition-transform hover:scale-[1.02] active:scale-[0.99]" style={solidCard}>
                        <div className="flex items-start gap-3">
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.12)" }}>
                                {product?.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <Package size={22} style={{ color: "#0ea5e9" }} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                {loading ? (<><Shimmer className="mb-1.5 h-3 w-full" /><Shimmer className="h-2.5 w-16" /></>) : (
                                    <>
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: "rgba(14,165,233,0.1)", color: "#0ea5e9" }}>Physical</span>
                                            <Star size={9} fill="#f59e0b" stroke="none" />
                                            <span className="text-[9px] font-bold" style={{ color: "var(--color-text-muted)" }}>{product?.rating?.toFixed(1) ?? "4.8"}</span>
                                        </div>
                                        <p className="line-clamp-2 text-[11px] font-bold leading-snug" style={{ color: "var(--color-text-primary)" }}>
                                            {product?.name ?? "Casual Chic Shirt | Men's Soft-cotton"}
                                        </p>
                                        <p className="mt-0.5 text-[12px] font-black" style={{ color: JMV_ORANGE }}>{product?.price ?? "$49"}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </Link>
                </motion.div>

                {/* Live campaign — middle right, dark card */}
                <motion.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0, y: reduced ? 0 : [0, -5, 0] }}
                    transition={{ opacity: { duration: 0.6, delay: 0.25 }, y: { repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 } }}
                    className="absolute right-[2%] top-[32%] z-20 w-[168px]"
                >
                    <Link href={campaign ? `/ugc/${campaign.id}` : "/ugc"} className="block rounded-2xl p-3.5 transition-transform hover:scale-[1.02]" style={{ background: "linear-gradient(155deg, #111 0%, #1a1a1a 100%)", boxShadow: "0 16px 40px rgba(0,0,0,0.3)" }}>
                        <div className="mb-2 flex items-center justify-between">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(253,80,0,0.2)", color: JMV_ORANGE }}><Video size={13} /></div>
                            <div className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                                <span className="text-[8px] font-bold uppercase tracking-wider text-white/90">Live</span>
                            </div>
                        </div>
                        {loading ? (<><Shimmer className="mb-1 h-2 w-20" /><Shimmer className="h-4 w-14" /></>) : (
                            <>
                                <p className="mb-0.5 text-[9px] font-medium text-white/50">Monthly Campaign Performance</p>
                                <p className="mb-1 truncate text-[10px] font-bold text-white">{campaign?.title ?? "Live Campaign"}</p>
                                <p className="text-[14px] font-black" style={{ color: "#ff8a3d" }}>{campaign?.rate ?? "$500 / 1K Views"}</p>
                            </>
                        )}
                    </Link>
                </motion.div>

                {/* Community card — bottom left */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                    className="absolute bottom-[6%] left-0 z-20 w-[195px]"
                >
                    <Link href={community ? `/communities/${community.slug}` : "/communities"} className="block rounded-2xl p-3.5 transition-transform hover:scale-[1.02]" style={solidCard}>
                        <div className="flex items-center gap-2.5">
                            {community?.avatar ? (
                                <img src={community.avatar} alt="" className="h-9 w-9 rounded-full object-cover" style={{ border: `2px solid rgba(253,80,0,0.15)` }} />
                            ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `linear-gradient(145deg, ${JMV_ORANGE}, #ff7a30)` }}>
                                    <ShoppingBag size={14} color="#fff" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                {loading ? (<><Shimmer className="mb-1 h-3 w-20" /><Shimmer className="h-2.5 w-14" /></>) : (
                                    <>
                                        <p className="truncate text-[11px] font-bold" style={{ color: "var(--color-text-primary)" }}>{community?.name ?? "Jimvio Community"}</p>
                                        <p className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>{community?.memberCount ?? "56K+"} Members</p>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between border-t pt-2.5" style={{ borderColor: "var(--color-border)" }}>
                            <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>Active Now</span>
                            </div>
                            <Zap size={12} style={{ color: JMV_ORANGE }} />
                        </div>
                    </Link>
                </motion.div>

                {/* Sale notification — bottom right */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: reduced ? 0 : [0, -3, 0] }}
                    transition={{ opacity: { duration: 0.5, delay: 0.45 }, y: { repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1.2 } }}
                    className="absolute bottom-[22%] right-[4%] z-30"
                >
                    <div className="flex items-center gap-2 rounded-full px-3.5 py-2" style={{ ...solidCard, border: "1px solid rgba(34,197,94,0.3)", boxShadow: "0 8px 24px rgba(34,197,94,0.12)" }}>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                            <TrendingUp size={12} strokeWidth={2.4} />
                        </div>
                        {loading ? <Shimmer className="h-3 w-16" /> : (
                            <span className="whitespace-nowrap text-[12px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                                New sale <span style={{ color: "#22c55e" }}>{sale.amount}</span>
                            </span>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
const HERO_STATS = [
    { val: "$840", label: "per minute", accent: "#22c55e" },
    { val: "50+", label: "countries", accent: JMV_ORANGE },
    { val: "$1M+", label: "paid out", accent: "#facc15" },
    { val: "10K+", label: "creators", accent: "#0ea5e9" },
];

export function Hero() {
    const [activeCount, setActiveCount] = useState(9200);
    const [currentWord, setCurrentWord] = useState(0);
    const words = ["Sell Products", "Build Audiences", "Earn Commissions", "Grow Globally"];
    const router = useRouter();
    const reduced = useReducedMotion();

    useEffect(() => { setActiveCount(Math.floor(Math.random() * 3000) + 8200); }, []);
    useEffect(() => {
        const t = setInterval(() => setCurrentWord(w => (w + 1) % words.length), 2800);
        return () => clearInterval(t);
    }, []);

    const handleLive = () => router.push("/live-activities");

    const mobileStats = [
        { label: "Live transactions", val: "$840 / min", dot: "#22c55e" },
        { label: "Active users", val: `${activeCount.toLocaleString()}`, dot: "#22c55e" },
        { label: "Countries", val: "50+", dot: JMV_ORANGE },
        { label: "Total paid", val: "$1M+", dot: JMV_ORANGE },
    ];
    const [mobileStatIdx, setMobileStatIdx] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setMobileStatIdx(i => (i + 1) % mobileStats.length), 2800);
        return () => clearInterval(t);
    }, []);

    return (
        <section className="relative overflow-hidden pb-24 pt-16 sm:pb-32 sm:pt-24" style={{ background: "var(--color-bg)" }}>
            <HeroBackground reduced={reduced} />

            <div className="relative z-10 mx-auto max-w-8xl px-4 sm:px-6">
                <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_600px] xl:gap-16">

                    <motion.div initial="hidden" animate="show" variants={stagger} className="text-center lg:text-left">
                        {/* Eyebrow */}
                        <motion.div variants={fadeUp} className="mb-6 flex justify-center lg:justify-start">
                            <div className="sm:hidden">
                                <button onClick={handleLive} className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold active:scale-[0.98]"
                                    style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.2)", color: JMV_ORANGE }}>
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: mobileStats[mobileStatIdx].dot }} />
                                    <AnimatePresence mode="wait">
                                        <motion.span key={mobileStatIdx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                            transition={{ duration: 0.2 }} className="flex items-center gap-1.5">
                                            <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{mobileStats[mobileStatIdx].label}:</span>
                                            <span style={{ color: JMV_ORANGE, fontWeight: 800 }}>{mobileStats[mobileStatIdx].val}</span>
                                        </motion.span>
                                    </AnimatePresence>
                                    <ArrowRight size={10} className="opacity-50" />
                                </button>
                            </div>
                            <button onClick={handleLive} className="group hidden items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] sm:inline-flex"
                                style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.2)", color: JMV_ORANGE }}>
                                <Sparkles size={13} style={{ color: JMV_ORANGE }} />
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                {activeCount.toLocaleString()} people active now
                                <ArrowRight size={11} className="opacity-0 transition-opacity group-hover:opacity-50" />
                            </button>
                        </motion.div>

                        {/* Headline — no blur */}
                        <motion.div variants={fadeUp} className="mb-5">
                            <h1 className="font-black leading-[1.02] tracking-tight"
                                style={{ fontSize: "clamp(2.8rem,5.2vw,4.6rem)", color: "var(--color-text-primary)", letterSpacing: "-0.035em" }}>
                                The platform to
                                <br />
                                <span className="relative inline-block overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.span key={currentWord}
                                            initial={{ y: 32, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -32, opacity: 0 }}
                                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                            className="block bg-clip-text"
                                            style={{ background: "linear-gradient(120deg, #fd5000 0%, #ff8a3d 45%, #facc15 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                                        >
                                            {words[currentWord]}
                                        </motion.span>
                                    </AnimatePresence>
                                    <motion.span key={`underline-${currentWord}`} className="absolute -bottom-1 left-0 h-[3px] rounded-full"
                                        style={{ background: "linear-gradient(90deg, #fd5000, #facc15)" }}
                                        initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5, delay: 0.2 }} />
                                </span>
                                <br />
                                <span style={{ color: "var(--color-text-primary)" }}>Anywhere.</span>
                            </h1>
                        </motion.div>

                        <motion.p variants={fadeUp} className="mx-auto mb-8 max-w-[560px] text-base leading-relaxed sm:text-lg lg:mx-0"
                            style={{ color: "var(--color-text-secondary)" }}>
                            Sell products. Promote offers. Create content. Build your community. Grow your audience — all in one place.
                        </motion.p>

                        {/* Stats */}
                        <motion.div variants={fadeUp} className="mb-9 hidden grid-cols-4 gap-3 sm:grid">
                            {HERO_STATS.map(s => (
                                <div key={s.label} className="rounded-2xl px-3 py-3 text-center" style={{ ...solidCard, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
                                    <p className="text-lg font-black leading-none" style={{ color: s.accent }}>{s.val}</p>
                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{s.label}</p>
                                </div>
                            ))}
                        </motion.div>

                        {/* CTAs */}
                        <motion.div variants={fadeUp} className="mb-10 flex flex-col justify-center gap-4 sm:flex-row sm:items-center sm:gap-5 lg:justify-start">
                            <Button3D href="/register"
                                className="group relative inline-flex h-[54px] overflow-hidden rounded-2xl px-8 text-sm font-bold text-white"
                                style={{ background: `linear-gradient(135deg, ${JMV_ORANGE} 0%, #ff6a1a 100%)`, boxShadow: "0 12px 40px rgba(253,80,0,0.28)" }}
                            >
                                Start Earning for Free
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </Button3D>
                            <Link href="/marketplace"
                                className="inline-flex h-[54px] items-center justify-center gap-2 rounded-2xl border px-6 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                                <Play size={12} fill={JMV_ORANGE} stroke="none" style={{ color: JMV_ORANGE }} />
                                Watch how it works
                            </Link>
                        </motion.div>

                        <motion.div variants={fadeUp} className="flex flex-col gap-5">
                            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                                {[{ icon: Shield, label: "Secure Payments" }, { icon: CheckCircle, label: "Verified Vendors" }, { icon: Globe, label: "90+ Countries" }]
                                    .map(({ icon: Icon, label }) => (
                                        <div key={label} className="flex items-center gap-2 rounded-full border px-3 py-1.5" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                                            <Icon className="h-3.5 w-3.5" style={{ color: JMV_ORANGE }} />
                                            <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
                                        </div>
                                    ))}
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Globe visual — matches reference layout */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="relative hidden w-full sm:block"
                        style={{ minHeight: 560, alignSelf: "center" }}
                    >
                        <FloatingHeroVisual />
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
