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
  Lock,
  MessageCircle,
  Sparkles,
  Users,
  Video,
  Globe,
  Star,
  ShieldCheck,
  Zap,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDisplayMoney, formatNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  const k = icon.toLowerCase();
  return ICON_MAP[k] ?? LayoutGrid;
}

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

  useEffect(() => {
    setLocalMembership(membership);
  }, [community.id, membership]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/spaces/${community.id}`)
      .then((r) => r.json())
      .then((d: { spaces?: SpaceRow[] }) => {
        if (!cancelled) setSpaces(d.spaces ?? []);
      })
      .catch(() => {
        if (!cancelled) setSpaces([]);
      });
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
    return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(raw));
  }, [localMembership]);

  const monthly = Number(community.monthly_price ?? 0);
  const yearly = Number(community.yearly_price ?? 0);
  const lifetime = Number(community.lifetime_price ?? 0);
  const currency = (community.currency || "USD").toUpperCase();

  const isFree = community.is_free || (monthly === 0 && yearly === 0 && lifetime === 0);

  const priceForPlan = (p: PlanKey) => (p === "monthly" ? monthly : p === "yearly" ? yearly : lifetime);

  const loginNext = `/login?next=${encodeURIComponent(`/communities/${community.slug}`)}`;

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

  return (
    <div className="min-h-screen bg-white dark:bg-bg">
      {/* ── STUNNING HERO ── */}
      <section className="relative">
        <div className="h-[280px] sm:h-[400px] w-full relative overflow-hidden">
          {community.cover_image ? (
            <Image src={community.cover_image} alt="" fill className="object-cover" unoptimized priority />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1a1428] via-[#433360] to-[#f97316]/20" />
          )}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950 via-transparent to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-6 -mt-32 sm:-mt-44 relative z-10 flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-1.5 rounded-[40px] bg-white dark:bg-surface shadow-2xl"
          >
            <div className="h-24 w-24 sm:h-36 sm:w-36 rounded-[34px] bg-zinc-100 dark:bg-surface-secondary overflow-hidden border-4 border-white dark:border-zinc-900">
              {community.avatar_url ? (
                <img src={community.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-4xl font-black text-orange-500">
                  {community.name[0]}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 space-y-3"
          >
            <h1 className="text-4xl sm:text-6xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">
              {community.name}
            </h1>
            <p className="text-base sm:text-xl font-bold text-zinc-400 dark:text-text-muted max-w-2xl mx-auto leading-relaxed">
              {community.tagline}
            </p>
          </motion.div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 shadow-sm">
                <Users className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-black text-orange-700 dark:text-orange-400">{formatNumber(community.member_count ?? 0)} Members</span>
            </div>
            {community.category && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-50 dark:bg-surface-secondary border border-zinc-100 dark:border-border-strong shadow-sm">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-widest text-[10px]">{community.category}</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 shadow-sm">
                <Globe className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-black text-blue-700 dark:text-blue-400">Online Community</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16">
        
        {/* Left Side: About & Content */}
        <div className="lg:col-span-8 space-y-16">
          
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-orange-500 rounded-full" />
              <h2 className="text-2xl font-black text-stone-900 dark:text-white">Experience Excellence</h2>
            </div>
            <p className="text-lg font-medium text-zinc-500 dark:text-text-muted leading-relaxed whitespace-pre-wrap">
              {community.long_description || (community.description !== community.tagline ? community.description : null) || "This community is a curated professional space designed for high-impact networking, skill-sharing, and collective growth. Join us to unlock exclusive resources and connect with verified peers."}
            </p>
            {community.tags && (
              <div className="flex flex-wrap gap-2 pt-4">
                {community.tags.map(t => (
                  <span key={t} className="px-3 py-1 rounded-lg bg-zinc-50 dark:bg-surface-secondary border border-zinc-100 dark:border-border-strong text-xs font-black text-zinc-400 dark:text-text-muted uppercase tracking-widest">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-8">
            <h2 className="text-2xl font-black text-stone-900 dark:text-white">Curated Spaces</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {spaces === null ? [1,2,3,4].map(i => <div key={i} className="h-32 rounded-3xl bg-zinc-50 dark:bg-surface-secondary animate-pulse" />) : 
                spaces.length === 0 ? (
                  <div className="col-span-full p-12 rounded-[32px] bg-zinc-50/50 dark:bg-surface-secondary/30 border-2 border-dashed border-zinc-100 dark:border-border-strong text-center">
                     <p className="text-sm font-bold text-zinc-400 dark:text-text-muted">Host is currently curating this environment. Check back soon.</p>
                  </div>
                ) : (
                  spaces.map(s => {
                    const Icon = spaceIcon(s.icon);
                    return (
                      <div key={s.id} className="p-6 rounded-[32px] border border-zinc-100 dark:border-border bg-white dark:bg-surface hover:shadow-xl hover:shadow-orange-500/5 transition-all group cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="h-12 w-12 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase">
                            <ShieldCheck className="h-3 w-3" /> Secure Access
                          </div>
                        </div>
                        <h3 className="text-lg font-black text-stone-900 dark:text-white mt-4">{s.name}</h3>
                        <p className="text-sm font-medium text-zinc-400 dark:text-text-muted mt-1 line-clamp-2">{s.description || "Member-exclusive access rooms."}</p>
                      </div>
                    )
                  })
                )
               }
            </div>
          </section>
        </div>

        {/* Right Side: Action Card */}
        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-[32px] border border-orange-200 dark:border-border bg-white dark:bg-surface overflow-hidden shadow-xl shadow-orange-500/5">
            <div className="p-6 relative">
              
              <div className="relative z-10 flex flex-col gap-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-text-muted">Membership</p>
                  <h3 className="text-xl font-black text-stone-900 dark:text-white mt-1">Join Community</h3>
                </div>

                {isMember ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50">
                      <p className="text-xs font-black text-orange-700 dark:text-orange-400">ACTIVE MEMBERSHIP</p>
                      <p className="text-xs font-bold text-orange-600/70 dark:text-orange-500/70 mt-0.5">Joined in {memberSince}</p>
                    </div>
                    <Button asChild className="w-full h-14 rounded-2xl bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white font-black text-base shadow-xl hover:opacity-90">
                       <Link href={`/communities/${community.slug}/workspace`}>Open Workspace <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  </div>
                ) : isFree ? (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                       <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Free Access</p>
                       <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 mt-1">This community is open to everyone. Join now to start participating.</p>
                    </div>
                    <Button 
                      onClick={handleJoin}
                      disabled={joining}
                      className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                       {joining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Join Community"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex p-1 bg-zinc-100 dark:bg-surface-secondary rounded-2xl">
                      {["monthly", "yearly", "lifetime"].map(p => (
                        <button 
                          key={p} 
                          onClick={() => setPlan(p as PlanKey)}
                          className={cn("flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all", plan === p ? "bg-white dark:bg-zinc-700 text-orange-600 shadow-sm" : "text-zinc-400 dark:text-text-muted hover:text-zinc-600 dark:hover:text-zinc-300")}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <div className="text-center py-2">
                       <p className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter tabular-nums">
                         {formatDisplayMoney(priceForPlan(plan), currency)}
                       </p>
                       <p className="text-[11px] font-bold text-zinc-400 dark:text-text-muted mt-1">{plan === "monthly" ? "Every month" : plan === "yearly" ? "Billed annually" : "One-time access"}</p>
                    </div>

                    <div className="space-y-3">
                       {["Full workspace access", "Direct creator chat", "Priority support"].map(line => (
                        <div key={line} className="flex gap-3 text-sm font-bold text-zinc-500 dark:text-text-muted">
                           <Check className="h-4 w-4 text-orange-500 shrink-0" /> {line}
                        </div>
                       ))}
                    </div>

                    <Button asChild variant="orange" className="w-full h-12 rounded-xl font-black text-sm active:scale-95 transition-all uppercase tracking-widest">
                       <Link href={isLoggedIn ? `/communities/${community.slug}/subscribe?plan=${plan}` : loginNext}>
                          Join Now <ArrowRight className="ml-2 h-4 w-4" />
                       </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="px-6 py-3 bg-zinc-50 dark:bg-surface-secondary flex items-center justify-between text-zinc-400 dark:text-text-muted text-[9px] font-black italic tracking-widest leading-none border-t border-zinc-100 dark:border-border-strong">
                <span>SECURED BY JIMVIO</span>
                <ShieldCheck className="h-3 w-3" />
            </div>
          </div>

            <div className="rounded-[24px] border border-zinc-100 dark:border-border p-6 space-y-4 bg-white dark:bg-surface">
             <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 dark:text-text-muted">Top Members</h3>
             <div className="flex -space-x-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-12 w-12 rounded-full border-4 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-surface-secondary flex items-center justify-center text-xs font-black text-zinc-300 dark:text-zinc-600">
                    <Users className="h-4 w-4" />
                  </div>
                ))}
                <div className="h-12 w-12 rounded-full border-4 border-white dark:border-zinc-900 bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-xs font-black text-orange-600 dark:text-orange-400">
                  +{formatNumber(community.member_count ?? 0)}
                </div>
             </div>
             <p className="text-xs font-bold text-zinc-500 dark:text-text-muted leading-relaxed">Join {formatNumber(community.member_count ?? 0)} others who are already upgrading their careers here.</p>
          </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
