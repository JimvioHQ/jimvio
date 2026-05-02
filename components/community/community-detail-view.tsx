// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import Image from "next/image";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import {
//   BookOpen,
//   Check,
//   LayoutGrid,
//   Loader2,
//   Lock,
//   MessageCircle,
//   Sparkles,
//   Users,
//   Video,
//   Globe,
//   Star,
//   ShieldCheck,
//   Zap,
//   ArrowRight,
//   type LucideIcon,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { cn, formatDisplayMoney, formatNumber } from "@/lib/utils";
// import { motion, AnimatePresence } from "framer-motion";

// type ProfileRef = {
//   id?: string;
//   full_name?: string | null;
//   avatar_url?: string | null;
//   username?: string | null;
// } | null;

// export type CommunityDetailPayload = {
//   id: string;
//   name: string;
//   slug: string;
//   tagline: string | null;
//   description: string | null;
//   long_description: string | null;
//   avatar_url: string | null;
//   cover_image: string | null;
//   category: string | null;
//   tags: string[] | null;
//   is_free: boolean | null;
//   monthly_price: number | string | null;
//   yearly_price: number | string | null;
//   lifetime_price: number | string | null;
//   currency: string | null;
//   member_count: number | null;
//   space_count: number | null;
//   profiles?: ProfileRef;
// };

// type MembershipPayload = {
//   status: string;
//   created_at: string | null;
//   subscribed_at: string | null;
//   expires_at: string | null;
//   plan_type: string | null;
// } | null;

// type SpaceRow = {
//   id: string;
//   name: string;
//   description: string | null;
//   icon: string | null;
//   access_type: string;
//   room_count: number | null;
//   hasAccess?: boolean;
// };

// type PlanKey = "monthly" | "yearly" | "lifetime";

// const ICON_MAP: Record<string, LucideIcon> = {
//   message: MessageCircle,
//   chat: MessageCircle,
//   course: BookOpen,
//   learn: BookOpen,
//   video: Video,
//   sparkles: Sparkles,
// };

// function spaceIcon(icon?: string | null): LucideIcon {
//   if (!icon) return LayoutGrid;
//   const k = icon.toLowerCase();
//   return ICON_MAP[k] ?? LayoutGrid;
// }

// export function CommunityDetailView({
//   community,
//   membership,
//   isLoggedIn,
// }: {
//   community: CommunityDetailPayload;
//   membership: MembershipPayload;
//   isLoggedIn: boolean;
// }) {
//   const router = useRouter();
//   const [spaces, setSpaces] = useState<SpaceRow[] | null>(null);
//   const [plan, setPlan] = useState<PlanKey>("monthly");
//   const [joining, setJoining] = useState(false);
//   const [localMembership, setLocalMembership] = useState<MembershipPayload>(membership);

//   useEffect(() => {
//     setLocalMembership(membership);
//   }, [community.id, membership]);

//   useEffect(() => {
//     let cancelled = false;
//     fetch(`/api/spaces/${community.id}`)
//       .then((r) => r.json())
//       .then((d: { spaces?: SpaceRow[] }) => {
//         if (!cancelled) setSpaces(d.spaces ?? []);
//       })
//       .catch(() => {
//         if (!cancelled) setSpaces([]);
//       });
//     return () => { cancelled = true; };
//   }, [community.id]);

//   const isMember = useMemo(() => {
//     if (!localMembership || localMembership.status !== "active") return false;
//     if (localMembership.expires_at && new Date(localMembership.expires_at) < new Date()) return false;
//     return true;
//   }, [localMembership]);

//   const memberSince = useMemo(() => {
//     const raw = localMembership?.subscribed_at || localMembership?.created_at;
//     if (!raw) return null;
//     return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(raw));
//   }, [localMembership]);

//   const monthly = Number(community.monthly_price ?? 0);
//   const yearly = Number(community.yearly_price ?? 0);
//   const lifetime = Number(community.lifetime_price ?? 0);
//   const currency = (community.currency || "USD").toUpperCase();

//   const isFree = community.is_free || (monthly === 0 && yearly === 0 && lifetime === 0);

//   const priceForPlan = (p: PlanKey) => (p === "monthly" ? monthly : p === "yearly" ? yearly : lifetime);

//   const loginNext = `/login?next=${encodeURIComponent(`/communities/${community.slug}`)}`;

//   async function handleJoin() {
//     if (!isLoggedIn) { router.push(loginNext); return; }
//     setJoining(true);
//     try {
//       const res = await fetch(`/api/communities/${community.slug}/join`, { method: "POST" });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error);
//       setLocalMembership(data.membership);
//       router.refresh();
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setJoining(false);
//     }
//   }

//   return (
//     <div className="min-h-screen bg-white dark:bg-bg">
//       {/* ── STUNNING HERO ── */}
//       <section className="relative">
//         <div className="h-[280px] sm:h-[400px] w-full relative overflow-hidden">
//           {community.cover_image ? (
//             <Image src={community.cover_image} alt="" fill className="object-cover" unoptimized priority />
//           ) : (
//             <div className="absolute inset-0 bg-gradient-to-tr from-[#1a1428] via-[#433360] to-[#f97316]/20" />
//           )}
//           <div className="absolute inset-0 bg-black/30 " />
//           <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950 via-transparent to-transparent" />
//         </div>

//         <div className="max-w-7xl mx-auto px-6 -mt-32 sm:-mt-44 relative z-10 flex flex-col items-center text-center">
//           <motion.div 
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             className="p-1.5 rounded-sm bg-white dark:bg-surface shadow-none"
//           >
//             <div className="h-24 w-24 sm:h-36 sm:w-36 rounded-sm bg-zinc-100 dark:bg-surface-secondary overflow-hidden border-4 border-white dark:border-zinc-900">
//               {community.avatar_url ? (
//                 <img src={community.avatar_url} alt="" className="h-full w-full object-cover" />
//               ) : (
//                 <div className="h-full w-full flex items-center justify-center text-4xl font-black text-orange-500">
//                   {community.name[0]}
//                 </div>
//               )}
//             </div>
//           </motion.div>

//           <motion.div 
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             transition={{ delay: 0.2 }}
//             className="mt-6 space-y-3"
//           >
//             <h1 className="text-4xl sm:text-6xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">
//               {community.name}
//             </h1>
//             <p className="text-base sm:text-xl font-bold text-zinc-400 dark:text-text-muted max-w-2xl mx-auto leading-relaxed">
//               {community.tagline}
//             </p>
//           </motion.div>

//           <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
//             <div className="flex items-center gap-2 px-4 py-2 rounded-sm bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 shadow-none">
//                 <Users className="h-4 w-4 text-orange-600" />
//                 <span className="text-sm font-black text-orange-700 dark:text-orange-400">{formatNumber(community.member_count ?? 0)} Members</span>
//             </div>
//             {community.category && (
//               <div className="flex items-center gap-2 px-4 py-2 rounded-sm bg-zinc-50 dark:bg-surface-secondary border border-zinc-100 dark:border-border-strong shadow-none">
//                   <Zap className="h-4 w-4 text-purple-600" />
//                   <span className="text-sm font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-widest text-[10px]">{community.category}</span>
//               </div>
//             )}
//             <div className="flex items-center gap-2 px-4 py-2 rounded-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 shadow-none">
//                 <Globe className="h-4 w-4 text-blue-600" />
//                 <span className="text-sm font-black text-blue-700 dark:text-blue-400">Online Community</span>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ── MAIN CONTENT GRID ── */}
//       <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16">

//         {/* Left Side: About & Content */}
//         <div className="lg:col-span-8 space-y-16">

//           <section className="space-y-6">
//             <div className="flex items-center gap-3">
//               <div className="w-1 h-8 bg-orange-500 rounded-sm" />
//               <h2 className="text-2xl font-black text-stone-900 dark:text-white">Experience Excellence</h2>
//             </div>
//             <p className="text-lg font-medium text-zinc-500 dark:text-text-muted leading-relaxed whitespace-pre-wrap">
//               {community.long_description || (community.description !== community.tagline ? community.description : null) || "This community is a curated professional space designed for high-impact networking, skill-sharing, and collective growth. Join us to unlock exclusive resources and connect with verified peers."}
//             </p>
//             {community.tags && (
//               <div className="flex flex-wrap gap-2 pt-4">
//                 {community.tags.map(t => (
//                   <span key={t} className="px-3 py-1 rounded-sm bg-zinc-50 dark:bg-surface-secondary border border-zinc-100 dark:border-border-strong text-xs font-black text-zinc-400 dark:text-text-muted uppercase tracking-widest">
//                     #{t}
//                   </span>
//                 ))}
//               </div>
//             )}
//           </section>

//           <section className="space-y-8">
//             <h2 className="text-2xl font-black text-stone-900 dark:text-white">Curated Spaces</h2>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                {spaces === null ? [1,2,3,4].map(i => <div key={i} className="h-32 rounded-sm bg-zinc-50 dark:bg-surface-secondary animate-pulse" />) : 
//                 spaces.length === 0 ? (
//                   <div className="col-span-full p-12 rounded-sm bg-zinc-50/50 dark:bg-surface-secondary/30 border-2 border-dashed border-zinc-100 dark:border-border-strong text-center">
//                      <p className="text-sm font-bold text-zinc-400 dark:text-text-muted">Host is currently curating this environment. Check back soon.</p>
//                   </div>
//                 ) : (
//                   spaces.map(s => {
//                     const Icon = spaceIcon(s.icon);
//                     return (
//                       <div key={s.id} className="p-6 rounded-sm border border-zinc-100 dark:border-border bg-white dark:bg-surface hover:shadow-none hover:shadow-orange-500/5 transition-all group cursor-pointer">
//                         <div className="flex items-start justify-between">
//                           <div className="h-12 w-12 rounded-sm bg-orange-50 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
//                             <Icon className="h-6 w-6" />
//                           </div>
//                           <div className="flex items-center gap-1 text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase">
//                             <ShieldCheck className="h-3 w-3" /> Secure Access
//                           </div>
//                         </div>
//                         <h3 className="text-lg font-black text-stone-900 dark:text-white mt-4">{s.name}</h3>
//                         <p className="text-sm font-medium text-zinc-400 dark:text-text-muted mt-1 line-clamp-2">{s.description || "Member-exclusive access rooms."}</p>
//                       </div>
//                     )
//                   })
//                 )
//                }
//             </div>
//           </section>
//         </div>

//         {/* Right Side: Action Card */}
//         <aside className="lg:col-span-4">
//           <div className="sticky top-24 space-y-6">
//             <div className="rounded-sm border border-orange-200 dark:border-border bg-white dark:bg-surface overflow-hidden shadow-none shadow-orange-500/5">
//             <div className="p-6 relative">

//               <div className="relative z-10 flex flex-col gap-5">
//                 <div>
//                   <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-text-muted">Membership</p>
//                   <h3 className="text-xl font-black text-stone-900 dark:text-white mt-1">Join Community</h3>
//                 </div>

//                 {isMember ? (
//                   <div className="space-y-4">
//                     <div className="p-4 rounded-sm bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50">
//                       <p className="text-xs font-black text-orange-700 dark:text-orange-400">ACTIVE MEMBERSHIP</p>
//                       <p className="text-xs font-bold text-orange-600/70 dark:text-orange-500/70 mt-0.5">Joined in {memberSince}</p>
//                     </div>
//                     <Button asChild className="w-full h-14 rounded-sm bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white font-black text-base shadow-none hover:opacity-90">
//                        <Link href={`/communities/${community.slug}/workspace`}>Open Workspace <ArrowRight className="ml-2 h-4 w-4" /></Link>
//                     </Button>
//                   </div>
//                 ) : isFree ? (
//                   <div className="space-y-6">
//                     <div className="p-5 rounded-sm bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
//                        <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Free Access</p>
//                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 mt-1">This community is open to everyone. Join now to start participating.</p>
//                     </div>
//                     <Button 
//                       onClick={handleJoin}
//                       disabled={joining}
//                       className="w-full h-14 rounded-sm bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base shadow-none shadow-emerald-500/20 active:scale-95 transition-all"
//                     >
//                        {joining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Join Community"}
//                     </Button>
//                   </div>
//                 ) : (
//                   <>
//                     <div className="flex p-1 bg-zinc-100 dark:bg-surface-secondary rounded-sm">
//                       {["monthly", "yearly", "lifetime"].map(p => (
//                         <button 
//                           key={p} 
//                           onClick={() => setPlan(p as PlanKey)}
//                           className={cn("flex-1 h-10 rounded-sm text-[10px] font-black uppercase tracking-tighter transition-all", plan === p ? "bg-white dark:bg-zinc-700 text-orange-600 shadow-none" : "text-zinc-400 dark:text-text-muted hover:text-zinc-600 dark:hover:text-zinc-300")}
//                         >
//                           {p}
//                         </button>
//                       ))}
//                     </div>

//                     <div className="text-center py-2">
//                        <p className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter tabular-nums">
//                          {formatDisplayMoney(priceForPlan(plan), currency)}
//                        </p>
//                        <p className="text-[11px] font-bold text-zinc-400 dark:text-text-muted mt-1">{plan === "monthly" ? "Every month" : plan === "yearly" ? "Billed annually" : "One-time access"}</p>
//                     </div>

//                     <div className="space-y-3">
//                        {["Full workspace access", "Direct creator chat", "Priority support"].map(line => (
//                         <div key={line} className="flex gap-3 text-sm font-bold text-zinc-500 dark:text-text-muted">
//                            <Check className="h-4 w-4 text-orange-500 shrink-0" /> {line}
//                         </div>
//                        ))}
//                     </div>

//                     <Button asChild variant="orange" className="w-full h-12 rounded-sm font-black text-sm active:scale-95 transition-all uppercase tracking-widest">
//                        <Link href={isLoggedIn ? `/communities/${community.slug}/subscribe?plan=${plan}` : loginNext}>
//                           Join Now <ArrowRight className="ml-2 h-4 w-4" />
//                        </Link>
//                     </Button>
//                   </>
//                 )}
//               </div>
//             </div>

//             <div className="px-6 py-3 bg-zinc-50 dark:bg-surface-secondary flex items-center justify-between text-zinc-400 dark:text-text-muted text-[9px] font-black italic tracking-widest leading-none border-t border-zinc-100 dark:border-border-strong">
//                 <span>SECURED BY JIMVIO</span>
//                 <ShieldCheck className="h-3 w-3" />
//             </div>
//           </div>

//             <div className="rounded-sm border border-zinc-100 dark:border-border p-6 space-y-4 bg-white dark:bg-surface">
//              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 dark:text-text-muted">Top Members</h3>
//              <div className="flex -space-x-3">
//                 {[1,2,3,4,5].map(i => (
//                   <div key={i} className="h-12 w-12 rounded-sm border-4 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-surface-secondary flex items-center justify-center text-xs font-black text-zinc-300 dark:text-zinc-600">
//                     <Users className="h-4 w-4" />
//                   </div>
//                 ))}
//                 <div className="h-12 w-12 rounded-sm border-4 border-white dark:border-zinc-900 bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-xs font-black text-orange-600 dark:text-orange-400">
//                   +{formatNumber(community.member_count ?? 0)}
//                 </div>
//              </div>
//              <p className="text-xs font-bold text-zinc-500 dark:text-text-muted leading-relaxed">Join {formatNumber(community.member_count ?? 0)} others who are already upgrading their careers here.</p>
//           </div>
//           </div>
//         </aside>

//       </div>
//     </div>
//   );
// }

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Sparkles,
  Users,
  Video,
  ShieldCheck,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDisplayMoney, formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import { useCurrency } from "@/context/CurrencyContext";
import { getUserCurrency } from "@/lib/currency/detect";

/* ─── Types ─── */
type ProfileRef = {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
} | null;

export type CommunityDetailPayload = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  long_description: string | null;
  avatar_url: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string[] | null;
  is_free: boolean | null;
  monthly_price: number | string | null;
  yearly_price: number | string | null;
  lifetime_price: number | string | null;
  currency: string | null;
  member_count: number | null;
  space_count: number | null;
  profiles?: ProfileRef;
};

type MembershipPayload = {
  status: string;
  created_at: string | null;
  subscribed_at: string | null;
  expires_at: string | null;
  plan_type: string | null;
} | null;

type SpaceRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  access_type: string;
  room_count: number | null;
  hasAccess?: boolean;
};

type PlanKey = "monthly" | "yearly" | "lifetime";

/* ─── Icon map ─── */
const ICON_MAP: Record<string, LucideIcon> = {
  message: MessageCircle,
  chat: MessageCircle,
  course: BookOpen,
  learn: BookOpen,
  video: Video,
  sparkles: Sparkles,
};

function spaceIcon(icon?: string | null): LucideIcon {
  if (!icon) return LayoutGrid;
  return ICON_MAP[icon.toLowerCase()] ?? LayoutGrid;
}

/* ─── Inline SVGs ─── */
const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M11 14v-1.5A3.5 3.5 0 0 0 7.5 9h-4A3.5 3.5 0 0 0 0 12.5V14" />
    <circle cx="5.5" cy="4.5" r="2.5" />
    <path d="M16 14v-1.338A3.5 3.5 0 0 0 13.5 9.5M11 2a2.5 2.5 0 0 1 0 5" />
  </svg>
);

const IconLock = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="7" width="10" height="8" rx="2" />
    <path d="M5 7V5a3 3 0 0 1 6 0v2" />
  </svg>
);

const IconGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 1.5C6 4 5 6 5 8s1 4 3 6.5M8 1.5C10 4 11 6 11 8s-1 4-3 6.5M1.5 8h13" />
  </svg>
);

/* ─── Helpers ─── */
function plural(n: number, word: string) {
  return `${formatNumber(n)} ${word}${n === 1 ? "" : "s"}`;
}

/* ────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────── */
export function CommunityDetailView({
  community,
  membership,
  isLoggedIn,
}: {
  community: CommunityDetailPayload;
  membership: MembershipPayload;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [spaces, setSpaces] = useState<SpaceRow[] | null>(null);
  const [plan, setPlan] = useState<PlanKey>("monthly");
  const [joining, setJoining] = useState(false);
  const [localMembership, setLocalMembership] = useState<MembershipPayload>(membership);
  const { formatMoney, userCurrency: Currency } = useCurrency()
  useEffect(() => { setLocalMembership(membership); }, [community.id, membership]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/spaces/${community.id}`)
      .then((r) => r.json())
      .then((d: { spaces?: SpaceRow[] }) => { if (!cancelled) setSpaces(d.spaces ?? []); })
      .catch(() => { if (!cancelled) setSpaces([]); });
    return () => { cancelled = true; };
  }, [community.id]);

  const isMember = useMemo(() => {
    if (!localMembership || localMembership.status !== "active") return false;
    if (localMembership.expires_at && new Date(localMembership.expires_at) < new Date()) return false;
    return true;
  }, [localMembership]);

  const memberSince = useMemo(() => {
    const raw = localMembership?.subscribed_at || localMembership?.created_at;
    if (!raw) return null;
    return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(raw));
  }, [localMembership]);

  const monthly = Number(community.monthly_price ?? 0);
  const yearly = Number(community.yearly_price ?? 0);
  const lifetime = Number(community.lifetime_price ?? 0);
  const currency = (community.currency || "USD").toUpperCase();
  const isFree = community.is_free || (monthly === 0 && yearly === 0 && lifetime === 0);
  const priceForPlan = (p: PlanKey) => p === "monthly" ? monthly : p === "yearly" ? yearly : lifetime;
  const loginNext = `/login?next=${encodeURIComponent(`/communities/${community.slug}`)}`;
  const initial = community.name?.[0]?.toUpperCase() ?? "?";

  async function handleJoin() {
    if (!isLoggedIn) { router.push(loginNext); return; }
    setJoining(true);
    try {
      const res = await fetch(`/api/communities/${community.slug}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLocalMembership(data.membership);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setJoining(false);
    }
  }

  /* ─── Savings callout for yearly ─── */
  const yearlySaving = monthly > 0 && yearly > 0
    ? Math.round(100 - (yearly / (monthly * 12)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#faf9f7] dark:bg-[#0c0c0c]">

      {/* ══════════ HERO ══════════ */}
      <section className="relative">
        {/* Cover */}
        <div className="h-[260px] sm:h-[380px] relative overflow-hidden bg-stone-200 dark:bg-stone-900">
          {community.cover_image ? (
            <Image
              src={community.cover_image}
              alt=""
              fill
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            /* Watermark fallback — editorial and distinctive */
            <div className="absolute inset-0 flex items-center justify-center select-none bg-gradient-to-br from-stone-100 to-orange-50/40 dark:from-stone-900 dark:to-orange-950/20">
              <span className="font-serif text-[220px] font-bold italic leading-none text-[#fd5000]/[0.07] dark:text-[#fd5000]/[0.06] tracking-tighter pointer-events-none">
                {initial}
              </span>
            </div>
          )}
          {/* Bottom fade into page */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#faf9f7] dark:from-[#0c0c0c] via-transparent to-transparent" />
        </div>

        {/* Avatar + identity — overlaps cover bottom */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="-mt-14 sm:-mt-16 relative z-10 flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-7">

            {/* Avatar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="shrink-0 h-[88px] w-[88px] sm:h-[108px] sm:w-[108px] rounded-[18px] overflow-hidden border-4 border-[#faf9f7] dark:border-[#0c0c0c] shadow-[0_4px_20px_rgba(0,0,0,0.12)] bg-white dark:bg-stone-800"
            >
              {community.avatar_url ? (
                <img src={community.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/20">
                  <span className="font-serif italic text-[42px] text-[#fd5000]">{initial}</span>
                </div>
              )}
            </motion.div>

            {/* Name + meta */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="pb-1 flex-1 min-w-0"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {community.category && (
                  <span className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                    {community.category}
                  </span>
                )}
                {isFree ? (
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                    Free
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#fd5000] border border-orange-100 dark:border-orange-900/50 flex items-center gap-1">
                    <IconLock size={9} /> Premium
                  </span>
                )}
              </div>
              <h1 className="text-[28px] font-bold sm:text-[38px] text-stone-900 dark:text-white leading-tight tracking-tight truncate">
                {community.name}
              </h1>
              <p className="mt-1 text-[14px] text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2 max-w-xl">
                {community.tagline}
              </p>
            </motion.div>
          </div>

          {/* Stat strip */}
          <div className="mt-6 flex flex-wrap gap-5 text-[13px] text-stone-500 dark:text-stone-400 font-medium pb-2 border-b border-stone-200 dark:border-stone-800">
            <span className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
              <IconUsers />
              {plural(community.member_count ?? 0, "member")}
            </span>
            {(community.space_count ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <LayoutGrid size={14} />
                {plural(community.space_count ?? 0, "space")}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <IconGlobe />
              Online community
            </span>
          </div>
        </div>
      </section>

      {/* ══════════ BODY GRID ══════════ */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 lg:gap-16 items-start">

        {/* ── LEFT: content ── */}
        <div className="space-y-14 min-w-0">

          {/* About */}
          <section className="space-y-5">
            <h2 className="text-[22px] font-semibold text-stone-900 dark:text-white">About</h2>
            <p className="text-[15px] leading-[1.75] text-stone-600 dark:text-stone-400 whitespace-pre-wrap">
              {community.long_description
                || (community.description !== community.tagline ? community.description : null)
                || "This community is a curated professional space designed for high-impact networking, skill-sharing, and collective growth. Join to unlock exclusive resources and connect with verified peers."}
            </p>
            {community.tags && community.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {community.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] font-medium px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                  >
                    {t.startsWith("#") ? t : `#${t}`}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Spaces */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-semibold text-stone-900 dark:text-white">Spaces</h2>
              {spaces && spaces.length > 0 && (
                <span className="text-[12px] text-stone-400">{spaces.length} available</span>
              )}
            </div>

            {spaces === null ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[100px] rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
                ))}
              </div>
            ) : spaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-600 gap-2">
                <LayoutGrid size={24} strokeWidth={1.5} />
                <p className="text-[13px]">Spaces are being set up — check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {spaces.map((s) => {
                  const Icon = spaceIcon(s.icon);
                  const locked = s.access_type === "paid" && !s.hasAccess;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer",
                        "bg-white dark:bg-stone-900",
                        "border-stone-150 dark:border-stone-800",
                        "hover:border-[#fd5000]/30 hover:shadow-[0_4px_20px_rgba(253,80,0,0.08)]",
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-[#fd5000] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                          <Icon size={18} strokeWidth={1.8} />
                        </div>
                        {locked && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-stone-400 dark:text-stone-600">
                            <IconLock size={10} /> Members only
                          </span>
                        )}
                      </div>
                      <h3 className="text-[15px] font-semibold text-stone-900 dark:text-white leading-snug group-hover:text-[#fd5000] transition-colors duration-200">
                        {s.name}
                      </h3>
                      <p className="mt-1 text-[13px] text-stone-400 dark:text-stone-500 leading-relaxed line-clamp-2">
                        {s.description || "Member-exclusive access."}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT: sticky action card ── */}
        <aside className="lg:sticky lg:top-24 space-y-4">

          {/* Main join card */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
            <div className="p-6 space-y-5">

              {/* ── Already a member ── */}
              {isMember ? (
                <>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40">
                    <div className="h-9 w-9 rounded-full bg-[#fd5000] flex items-center justify-center shrink-0">
                      <Check size={16} strokeWidth={2.5} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#fd5000]">Active member</p>
                      {memberSince && (
                        <p className="text-[12px] text-orange-400 dark:text-orange-600">Since {memberSince}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    asChild
                    className="w-full h-12 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-semibold text-[14px] hover:opacity-90 transition-opacity shadow-none border-0"
                  >
                    <Link href={`/communities/${community.slug}/workspace`}>
                      Open workspace <ArrowRight size={15} className="ml-1.5" />
                    </Link>
                  </Button>
                </>
              ) : isFree ? (
                /* ── Free community ── */
                <>
                  <div>
                    <p className="text-[11px] font-medium text-stone-400 uppercase tracking-widest mb-1">Access</p>
                    <p className="font-serif italic text-[28px] text-emerald-600 dark:text-emerald-400">Free</p>
                    <p className="text-[13px] text-stone-400 mt-0.5">No credit card required</p>
                  </div>
                  <ul className="space-y-2.5">
                    {["Full workspace access", "Community discussions", "Direct messaging"].map((line) => (
                      <li key={line} className="flex items-center gap-2.5 text-[13px] text-stone-600 dark:text-stone-400">
                        <span className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                          <Check size={10} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400" />
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[14px] transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_2px_0_rgba(0,100,60,0.3),_0_4px_14px_rgba(5,150,105,0.2)] border-0 cursor-pointer"
                  >
                    {joining ? <Loader2 size={17} className="animate-spin" /> : "Join for free"}
                  </button>
                </>
              ) : (
                /* ── Paid community ── */
                <>
                  {/* Plan switcher */}
                  <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                    {(["monthly", "yearly", "lifetime"] as PlanKey[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlan(p)}
                        className={cn(
                          "relative flex-1 h-9 rounded-[10px] text-[11px] font-semibold capitalize transition-all duration-200 cursor-pointer border-0",
                          plan === p
                            ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
                            : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 bg-transparent",
                        )}
                      >
                        {p}
                        {p === "yearly" && yearlySaving > 0 && (
                          <span className="absolute -top-2 -right-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40 leading-none">
                            -{yearlySaving}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Price display */}
                  <div>
                    <p className="text-[11px] font-medium text-stone-400 uppercase tracking-widest mb-1">Price</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[36px] font-mono tracking-tighter text-stone-900 dark:text-white leading-none">
                        {
                          formatMoney((priceForPlan(plan)), currency)
                        }
                      </span>
                      <span className="text-[12px] text-stone-400">
                        {plan === "monthly" ? "/ mo" : plan === "yearly" ? "/ yr" : "once"}
                      </span>
                    </div>
                    {plan === "yearly" && yearlySaving > 0 && (
                      <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mt-1">
                        Save {yearlySaving}% vs monthly
                      </p>
                    )}
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-2.5">
                    {["Full workspace access", "Direct creator chat", "Priority support"].map((line) => (
                      <li key={line} className="flex items-center gap-2.5 text-[13px] text-stone-600 dark:text-stone-400">
                        <span className="h-4 w-4 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                          <Check size={10} strokeWidth={3} className="text-[#fd5000]" />
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    asChild
                    className="w-full h-12 rounded-full bg-[#fd5000] hover:bg-[#e54800] text-white font-semibold text-[14px] transition-all duration-200 active:scale-[0.98] shadow-[0_2px_0_rgba(150,40,0,0.35),_0_4px_16px_rgba(253,80,0,0.25)] border-0"
                  >
                    <Link href={isLoggedIn ? `/communities/${community.slug}/subscribe?plan=${plan}` : loginNext}>
                      Join now <ArrowRight size={15} className="ml-1.5" />
                    </Link>
                  </Button>
                </>
              )}
            </div>

            {/* Footer strip */}
            <div className="px-6 py-3 bg-stone-50 dark:bg-stone-800/60 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <span className="text-[11px] text-stone-400 dark:text-stone-500 flex items-center gap-1.5">
                <ShieldCheck size={12} /> Secured by Jimvio
              </span>
              <span className="text-[11px] text-stone-300 dark:text-stone-600">
                {formatNumber(community.member_count ?? 0)} members
              </span>
            </div>
          </div>

          {/* Member avatars card */}
          <div className="rounded-2xl border border-stone-150 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
            <p className="text-[11px] font-medium text-stone-400 uppercase tracking-widest">Community</p>
            {/* Stacked placeholder avatars */}
            <div className="flex items-center -space-x-2.5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-9 rounded-full border-2 border-white dark:border-stone-900 bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden"
                  style={{ zIndex: 6 - i }}
                >
                  {/* Real avatars would go here via data */}
                  <Users size={13} className="text-stone-300 dark:text-stone-600" />
                </div>
              ))}
              <div
                className="h-9 w-9 rounded-full border-2 border-white dark:border-stone-900 bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center"
                style={{ zIndex: 0 }}
              >
                <span className="text-[10px] font-semibold text-[#fd5000]">
                  +{(community.member_count ?? 0) > 999 ? `${Math.floor((community.member_count ?? 0) / 1000)}k` : community.member_count}
                </span>
              </div>
            </div>
            <p className="text-[13px] text-stone-500 dark:text-stone-400 leading-relaxed">
              Join {formatNumber(community.member_count ?? 0)} others already here.
            </p>
          </div>

        </aside>
      </div>
    </div>
  );
}