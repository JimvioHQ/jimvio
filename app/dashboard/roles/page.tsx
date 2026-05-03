// "use client";
// export const dynamic = "force-dynamic";

// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import {
//   Package, Link2, Video, ShoppingBag, CheckCircle,
//   ArrowRight, Crown, Loader2, Sparkles, Rocket, Users, ShieldCheck, ArrowLeft,
// } from "lucide-react";
// import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
// import { Button } from "@/components/ui/button";
// import { createClient } from "@/lib/supabase/client";
// import { useUserStore } from "@/lib/store/use-user-store";
// import { type DashboardRole } from "@/components/dashboard/sidebar";
// import { toast } from "sonner";
// import { cn } from "@/lib/utils";

// type RoleStatus = "active" | "inactive" | "loading";

// interface RoleState {
//   buyer:      RoleStatus;
//   vendor:     RoleStatus;
//   affiliate:  RoleStatus;
//   influencer: RoleStatus;
// }

// const allRoles = [
//   {
//     id: "buyer" as const,
//     label: "Aesthetic Buyer",
//     icon: <ShoppingBag className="h-6 w-6" />,
//     color: "text-sky-500",
//     bg: "bg-sky-500/10",
//     badge: "Public Access",
//     description: "Shop for curated products from verified creators and vendors around the globe.",
//     features: ["500K+ Products", "Order Tracking", "Digital Assets", "Wishlist Support"],
//     alwaysActive: true,
//     setupPath: null,
//   },
//   {
//     id: "vendor" as const,
//     label: "Business Vendor",
//     icon: <Package className="h-6 w-6" />,
//     color: "text-orange-500",
//     bg: "bg-orange-500/10",
//     badge: "Merchant Tools",
//     description: "List your products, manage inventory, and handle orders with a professional dashboard.",
//     features: ["Custom Storefront", "Inventory Manager", "Order Management", "Fast Payouts"],
//     alwaysActive: false,
//     setupPath: "/dashboard/activate/vendor",
//   },
//   {
//     id: "affiliate" as const,
//     label: "Growth Partner",
//     icon: <Link2 className="h-6 w-6" />,
//     color: "text-emerald-500",
//     bg: "bg-emerald-500/10",
//     badge: "Earn Commission",
//     description: "Share products you love and earn a percentage of every sale you generate.",
//     features: ["Link Generator", "Sales Tracking", "Instant Earnings", "Top Products Hub"],
//     alwaysActive: false,
//     setupPath: null,
//   },
//   {
//     id: "influencer" as const,
//     label: "Content Creator",
//     icon: <Video className="h-6 w-6" />,
//     color: "text-indigo-500",
//     bg: "bg-indigo-500/10",
//     badge: "UGC Missions",
//     description: "Collaborate with brands on live missions. Create content and monetize your influence.",
//     features: ["Live Missions", "Brand Collaborations", "Video Uploads", "Campaign Bonuses"],
//     alwaysActive: false,
//     setupPath: null,
//   },
// ];

// export default function RolesPage() {
//   const router = useRouter();
//   const { activeRoles, fetchRoles, addRole } = useUserStore();
//   const [roleLocalStatus, setRoleLocalStatus] = useState<Record<string, RoleStatus>>({});
//   const [userId, setUserId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function init() {
//       const supabase = createClient();
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) { router.push("/login"); return; }
//       setUserId(user.id);
//       await fetchRoles();
//       setLoading(false);
//     }
//     init();
//   }, [router, fetchRoles]);

//   async function activateRole(roleId: keyof RoleState, setupPath: string | null) {
//     if (!userId || activeRoles.includes(roleId)) return;

//     setRoleLocalStatus(prev => ({ ...prev, [roleId]: "loading" }));
//     const supabase = createClient();

//     try {
//       if (roleId === "vendor") {
//          router.push(setupPath || "/dashboard/activate/vendor");
//          return;
//       }

//       const { error: upsertError } = await supabase.from("user_roles").upsert(
//         { user_id: userId, role: roleId, is_active: true },
//         { onConflict: "user_id,role" }
//       );

//       if (upsertError) throw upsertError;

//       if (roleId === "affiliate") {
//         const { error } = await supabase.from("affiliates").upsert({ user_id: userId }, { onConflict: "user_id" });
//         if (error) throw error;
//       } else if (roleId === "influencer") {
//         const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
//         const { error } = await supabase.from("influencers").upsert({
//           user_id:      userId,
//           display_name: prof?.full_name ?? "Influencer",
//         }, { onConflict: "user_id" });
//         if (error) throw error;
//       }

//       const { data: refreshedRoles, error: fetchErr } = await supabase.rpc('get_user_roles', { lookup_user_id: userId });
      
//       let finalRoles: DashboardRole[] = refreshedRoles as DashboardRole[] || ["buyer"];
//       if (!finalRoles.includes(roleId)) {
//         finalRoles = [...finalRoles, roleId];
//       }
      
//       useUserStore.setState({ activeRoles: finalRoles });

//       setRoleLocalStatus(prev => ({ ...prev, [roleId]: "active" }));
//       toast.success(`${roleId.charAt(0).toUpperCase() + roleId.slice(1)} role activated!`);
//     } catch (err: any) {
//       console.error("[RolesPage] activation failed:", err);
//       toast.error(err.message || "Activation failed");
//       setRoleLocalStatus(prev => ({ ...prev, [roleId]: "inactive" }));
//     }
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
//         <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
//         <p className="text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest pl-1">Loading Roles...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden bg-background">
//       <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 pt-6 sm:pt-10 relative z-10">
        
//         {/* Header - Simpler */}
//          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
//             <div className="flex items-center gap-3 sm:gap-4">
//                <Button asChild variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-surface dark:bg-surface-secondary border border-border shadow-sm hover:bg-surface dark:hover:bg-zinc-700 active:scale-95 transition-all text-stone-500 dark:text-text-muted">
//                  <Link href="/dashboard"><ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" /></Link>
//                </Button>
//                <div className="space-y-0.5 sm:space-y-1">
//                   <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white tracking-tight">Account Roles</h1>
//                   <p className="text-[9px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest leading-none pl-0.5">Activate paths to earn and grow</p>
//                </div>
//             </div>
            
//             <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-surface dark:bg-surface-secondary border border-border shadow-sm self-start sm:self-auto">
//                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted">{activeRoles.length} Active</span>
//             </div>
//          </div>

//         {/* Roles Grid - Softer Cards */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
//           {allRoles.map((r) => {
//             const isActive  = activeRoles.includes(r.id);
//             const isLoading = roleLocalStatus[r.id] === "loading";

//             return (
//               <GlassCard key={r.id} className={cn(
//                  "p-5 sm:p-7 rounded-2xl border-border transition-all duration-300 relative overflow-hidden flex flex-col h-full",
//                  isActive ? "bg-surface dark:bg-surface-secondary shadow-sm ring-1 ring-emerald-500/20" : "bg-surface/60 dark:bg-surface-secondary/40 hover:bg-surface/80 dark:hover:bg-zinc-800 shadow-sm"
//               )}>
//                   <div className="flex items-center justify-between mb-4 sm:mb-6">
//                      <div className={cn(
//                         "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border border-border bg-white dark:bg-surface shadow-sm",
//                         isActive ? "bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white" : cn(r.bg, r.color)
//                      )}>
//                         {r.icon}
//                      </div>
//                     {isActive ? (
//                        <GlassPill color="emerald" className="px-2.5 sm:px-3 py-1 text-[7px] sm:text-[8px] font-bold border-none shadow-sm uppercase tracking-widest bg-emerald-50 text-emerald-600 rounded-full">Active</GlassPill>
//                     ) : (
//                        <GlassPill color="orange" className="px-2.5 sm:px-3 py-1 text-[7px] sm:text-[8px] font-bold border-none shadow-sm uppercase tracking-widest bg-orange-50 text-orange-600 rounded-full">{r.badge}</GlassPill>
//                     )}
//                  </div>

//                   <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
//                      <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white tracking-tight">{r.label}</h3>
//                      <p className="text-[11px] sm:text-[13px] font-medium text-stone-500 dark:text-text-muted leading-relaxed">
//                         {r.description}
//                      </p>
//                   </div>

//                    <div className="space-y-2 mb-5 sm:mb-8 flex-1">
//                      {r.features.map((f, i) => (
//                         <div key={i} className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted">
//                            <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-200 dark:text-zinc-800 dark:text-text-secondary" />
//                            {f}
//                         </div>
//                      ))}
//                   </div>

//                   {isActive ? (
//                      <Button variant="outline" asChild className="w-full h-10 sm:h-11 rounded-xl border-border text-stone-900 dark:text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-widest active:scale-95 transition-all">
//                         <Link href="/dashboard">View Dashboard <ArrowRight className="h-3 w-3 ml-2" /></Link>
//                      </Button>
//                   ) : (
//                      <Button
//                         onClick={() => activateRole(r.id, r.setupPath)}
//                         disabled={isLoading}
//                         className="w-full h-10 sm:h-11 rounded-xl bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white hover:bg-black dark:hover:bg-stone-200 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest shadow-[0_4px_14px_rgba(0,0,0,0.1)] active:scale-95 transition-all border-none"
//                      >
//                         {isLoading ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin mr-2" /> : <Rocket className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-2" />}
//                         Activate Role
//                      </Button>
//                   )}
//               </GlassCard>
//             );
//           })}
//         </div>
        
//         {/* Support Section - Soft */}
//         <div className="p-6 sm:p-8 text-center rounded-2xl bg-stone-900 dark:bg-surface-secondary text-white relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/10">
//            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
//            <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mb-2">Need help?</p>
//            <h3 className="text-lg sm:text-xl font-bold tracking-tight mb-5 sm:mb-6">Explore our guides and tutorials</h3>
//            <Button asChild className="h-10 sm:h-11 px-6 sm:px-8 rounded-xl bg-white dark:bg-surface text-stone-900 dark:text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-widest shadow-sm hover:bg-stone-50 dark:bg-surface/50 active:scale-95 transition-all border-none">
//               <Link href="/help">View Documentation</Link>
//            </Button>
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Package, Link2, Video,
  ArrowLeft, ArrowRight, Loader2, Plus, Check,
  Info, BookOpen, Settings2, X, ToggleLeft,
  AlertTriangle, ChevronRight, ExternalLink,
  Clock, TrendingUp, ShieldCheck, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/lib/store/use-user-store";
import { type DashboardRole } from "@/components/dashboard/sidebar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────── */
type RoleId = "buyer" | "vendor" | "affiliate" | "influencer";

interface RoleMeta {
  activatedAt?: string;
  lastUsed?: string;
}

/* ─── Role definitions ────────────────────────────────────────────────── */
const ALL_ROLES = [
  {
    id: "buyer" as RoleId,
    label: "Aesthetic Buyer",
    icon: ShoppingBag,
    badge: "Public access",
    color: "sky",
    accent: "#0ea5e9",
    description: "Shop curated products from verified creators and vendors worldwide.",
    features: ["500K+ products", "Order tracking", "Digital assets", "Wishlist"],
    alwaysActive: true,
    setupPath: null,
    dashboardPath: "/dashboard/buyer",
    settingsPath: "/dashboard/settings/buyer",
    docsPath: "/help/buyer",
  },
  {
    id: "vendor" as RoleId,
    label: "Business Vendor",
    icon: Package,
    badge: "Merchant tools",
    color: "orange",
    accent: "#f97316",
    description: "List products, manage inventory, and handle orders with a professional dashboard.",
    features: ["Custom storefront", "Inventory manager", "Order management", "Fast payouts"],
    alwaysActive: false,
    setupPath: "/dashboard/activate/vendor",
    dashboardPath: "/dashboard/vendor",
    settingsPath: "/dashboard/settings/vendor",
    docsPath: "/help/vendor",
  },
  {
    id: "affiliate" as RoleId,
    label: "Growth Partner",
    icon: Link2,
    badge: "Earn commission",
    color: "emerald",
    accent: "#10b981",
    description: "Share products you love and earn a percentage on every sale you generate.",
    features: ["Link generator", "Sales tracking", "Instant earnings", "Top products hub"],
    alwaysActive: false,
    setupPath: null,
    dashboardPath: "/dashboard/affiliate",
    settingsPath: "/dashboard/settings/affiliate",
    docsPath: "/help/affiliate",
  },
  {
    id: "influencer" as RoleId,
    label: "Content Creator",
    icon: Video,
    badge: "UGC missions",
    color: "violet",
    accent: "#8b5cf6",
    description: "Collaborate with brands on live missions and monetize your influence.",
    features: ["Live missions", "Brand collabs", "Video uploads", "Campaign bonuses"],
    alwaysActive: false,
    setupPath: null,
    dashboardPath: "/dashboard/influencer",
    settingsPath: "/dashboard/settings/influencer",
    docsPath: "/help/influencer",
  },
] as const;

/* ─── Color maps ─────────────────────────────────────────────────────── */
const COLOR_MAP: Record<string, {
  icon: string; iconBg: string; pill: string;
  pillText: string; ring: string;
}> = {
  sky:     { icon: "text-sky-500",     iconBg: "bg-sky-50 dark:bg-sky-950/40",         pill: "bg-sky-50 dark:bg-sky-950/40",         pillText: "text-sky-600 dark:text-sky-400",         ring: "ring-sky-500/20"     },
  orange:  { icon: "text-orange-500",  iconBg: "bg-orange-50 dark:bg-orange-950/40",   pill: "bg-orange-50 dark:bg-orange-950/40",   pillText: "text-orange-600 dark:text-orange-400",   ring: "ring-orange-500/20"  },
  emerald: { icon: "text-emerald-500", iconBg: "bg-emerald-50 dark:bg-emerald-950/40", pill: "bg-emerald-50 dark:bg-emerald-950/40", pillText: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  violet:  { icon: "text-violet-500",  iconBg: "bg-violet-50 dark:bg-violet-950/40",   pill: "bg-violet-50 dark:bg-violet-950/40",   pillText: "text-violet-600 dark:text-violet-400",   ring: "ring-violet-500/20"  },
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ─── Progress ring ───────────────────────────────────────────────────── */
function ProgressRing({ active, total }: { active: number; total: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * active) / total;
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="-rotate-90 w-full h-full" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} className="fill-none stroke-border" strokeWidth="3" />
        <circle cx="24" cy="24" r={r}
          className="fill-none stroke-emerald-500 transition-all duration-700 ease-out"
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-semibold tracking-tight">{active}</span>
        <span className="text-[8px] font-medium uppercase tracking-widest text-muted-foreground mt-0.5">active</span>
      </div>
    </div>
  );
}

/* ─── Role Settings Drawer ────────────────────────────────────────────── */
function RoleDrawer({
  role,
  isActive,
  meta,
  onClose,
  onDeactivate,
  deactivating,
}: {
  role: typeof ALL_ROLES[number];
  isActive: boolean;
  meta?: RoleMeta;
  onClose: () => void;
  onDeactivate: () => void;
  deactivating: boolean;
}) {
  const c = COLOR_MAP[role.color];
  const Icon = role.icon;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
    >
      <div className="w-full sm:max-w-md bg-background border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250 overflow-hidden">

        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border border-border/50", isActive ? c.iconBg : "bg-muted/50")}>
              <Icon className={cn("h-4 w-4", isActive ? c.icon : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-[13px] font-semibold">{role.label}</p>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", isActive ? "text-emerald-500" : "text-muted-foreground")}>
                {isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {/* Meta stats */}
          {isActive && (
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> Activated
                </p>
                <p className="text-[12px] font-semibold">{meta?.activatedAt ? formatDate(meta.activatedAt) : "—"}</p>
              </div>
              <div className="px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5" /> Last used
                </p>
                <p className="text-[12px] font-semibold">{meta?.lastUsed ? timeAgo(meta.lastUsed) : "—"}</p>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">Quick actions</p>

            {[
              { href: role.dashboardPath, icon: TrendingUp, label: "Open dashboard", external: false },
              { href: role.settingsPath,  icon: Pencil,     label: "Role settings",   external: false },
              { href: role.docsPath,      icon: BookOpen,   label: "View documentation", external: true },
            ].map(({ href, icon: NavIcon, label, external }) => (
              <Link key={href} href={href} target={external ? "_blank" : undefined}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                    <NavIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-[12px] font-medium">{label}</span>
                </div>
                {external
                  ? <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                }
              </Link>
            ))}
          </div>

          {/* Deactivate zone */}
          {!role.alwaysActive && isActive && (
            <div className="border border-red-200 dark:border-red-900/40 rounded-xl p-3.5 bg-red-50/50 dark:bg-red-950/20">
              <div className="flex items-start gap-2.5 mb-3">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-red-700 dark:text-red-400 mb-0.5">Deactivate role</p>
                  <p className="text-[10px] text-red-600/80 dark:text-red-400/70 leading-relaxed">
                    Your data and settings will be preserved. You can reactivate at any time.
                  </p>
                </div>
              </div>
              <button
                onClick={onDeactivate}
                disabled={deactivating}
                className="w-full h-8 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-semibold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all hover:bg-red-50 dark:hover:bg-red-950/60 disabled:opacity-50"
              >
                {deactivating
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Deactivating…</>
                  : <><ToggleLeft className="h-3.5 w-3.5" /> Deactivate</>
                }
              </button>
            </div>
          )}

          {role.alwaysActive && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">This role is required and cannot be deactivated.</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose}
            className="w-full h-9 rounded-xl border border-border text-[10px] font-semibold uppercase tracking-widest hover:bg-muted transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Role card ───────────────────────────────────────────────────────── */
function RoleCard({
  role, isActive, isLoading, meta, onActivate, onOpenDrawer,
}: {
  role: typeof ALL_ROLES[number];
  isActive: boolean;
  isLoading: boolean;
  meta?: RoleMeta;
  onActivate: () => void;
  onOpenDrawer: () => void;
}) {
  const c = COLOR_MAP[role.color];
  const Icon = role.icon;

  return (
    <div className={cn(
      "group relative flex flex-col rounded-2xl border bg-card p-5 transition-all duration-200 overflow-hidden",
      isActive
        ? cn("border-transparent shadow-sm ring-1", c.ring)
        : "border-border hover:border-border/80 hover:-translate-y-px hover:shadow-sm",
      isLoading && "pointer-events-none opacity-60"
    )}>
      {/* Accent bar */}
      <div
        className={cn("absolute top-0 inset-x-0 h-[3px] rounded-t-2xl transition-opacity duration-300", isActive ? "opacity-100" : "opacity-0")}
        style={{ background: `linear-gradient(90deg, ${role.accent}, ${role.accent}55)` }}
      />

      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-border/50 transition-colors", isActive ? c.iconBg : "bg-muted/50")}>
          <Icon className={cn("h-[18px] w-[18px] transition-colors", isActive ? c.icon : "text-muted-foreground")} />
        </div>
        {isActive ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Check className="h-2.5 w-2.5" /> Active
          </span>
        ) : (
          <span className={cn("text-[9px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full", c.pill, c.pillText)}>
            {role.badge}
          </span>
        )}
      </div>

      {/* Content */}
      <p className="text-[13px] font-semibold tracking-tight mb-1.5">{role.label}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-3 flex-1">{role.description}</p>

      {/* Activation timestamp */}
      {isActive && meta?.activatedAt && (
        <p className="text-[9px] text-muted-foreground/60 mb-3 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          Active since {formatDate(meta.activatedAt)}
        </p>
      )}

      {/* Feature tags */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {role.features.map((f) => (
          <span key={f} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
            {f}
          </span>
        ))}
      </div>

      {/* CTA */}
      {isActive ? (
        <div className="flex gap-2">
          <Button variant="outline" asChild className="flex-1 h-9 rounded-xl text-[10px] font-semibold uppercase tracking-widest border-border/60">
            <Link href={role.dashboardPath}>
              Dashboard <ArrowRight className="h-3 w-3 ml-1.5" />
            </Link>
          </Button>
          <button
            onClick={onOpenDrawer}
            className="w-9 h-9 rounded-xl border border-border/60 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
            title="Manage role"
          >
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <button
          onClick={onActivate}
          disabled={isLoading}
          className="w-full h-9 rounded-xl bg-foreground text-background text-[10px] font-semibold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all hover:opacity-85 hover:-translate-y-px active:scale-[.98] disabled:pointer-events-none"
        >
          {isLoading
            ? <><Loader2 className="h-3 w-3 animate-spin" /> Activating…</>
            : <><Plus className="h-3 w-3" /> Activate role</>
          }
        </button>
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────── */
export default function RolesPage() {
  const router = useRouter();
  const { activeRoles, fetchRoles } = useUserStore();
  const [loadingRoles, setLoadingRoles] = useState<Set<RoleId>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [drawerRole, setDrawerRole] = useState<RoleId | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [roleMeta, setRoleMeta] = useState<Partial<Record<RoleId, RoleMeta>>>({});

  /* Load meta timestamps from localStorage */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("role_meta");
      if (stored) setRoleMeta(JSON.parse(stored));
    } catch {}
  }, []);

  const saveMeta = useCallback((meta: Partial<Record<RoleId, RoleMeta>>) => {
    setRoleMeta(meta);
    try { localStorage.setItem("role_meta", JSON.stringify(meta)); } catch {}
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      await fetchRoles();
      setPageLoading(false);
    }
    init();
  }, [router, fetchRoles]);

  const setRoleLoading = useCallback((id: RoleId, val: boolean) => {
    setLoadingRoles(prev => {
      const next = new Set(prev);
      val ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  /* ── Activate ── */
  async function activateRole(roleId: RoleId, setupPath: string | null) {
    if (!userId || activeRoles.includes(roleId)) return;

    if (roleId === "vendor") {
      router.push(setupPath || "/dashboard/activate/vendor");
      return;
    }

    setRoleLoading(roleId, true);
    const supabase = createClient();

    try {
      const { error: upsertError } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: roleId, is_active: true }, { onConflict: "user_id,role" });
      if (upsertError) throw upsertError;

      if (roleId === "affiliate") {
        const { error } = await supabase.from("affiliates").upsert({ user_id: userId }, { onConflict: "user_id" });
        if (error) throw error;
      } else if (roleId === "influencer") {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
        const { error } = await supabase.from("influencers").upsert(
          { user_id: userId, display_name: prof?.full_name ?? "Influencer" },
          { onConflict: "user_id" }
        );
        if (error) throw error;
      }

      const { data: refreshedRoles } = await supabase.rpc("get_user_roles", { lookup_user_id: userId });
      let finalRoles: DashboardRole[] = (refreshedRoles as DashboardRole[]) ?? ["buyer"];
      if (!finalRoles.includes(roleId)) finalRoles = [...finalRoles, roleId];
      useUserStore.setState({ activeRoles: finalRoles });

      saveMeta({ ...roleMeta, [roleId]: { activatedAt: new Date().toISOString(), lastUsed: new Date().toISOString() } });

      const label = ALL_ROLES.find(r => r.id === roleId)?.label ?? roleId;
      toast.success(`${label} activated!`);
    } catch (err: any) {
      console.error("[RolesPage] activation failed:", err);
      toast.error(err.message || "Activation failed. Please try again.");
    } finally {
      setRoleLoading(roleId, false);
    }
  }

  /* ── Deactivate ── */
  async function deactivateRole(roleId: RoleId) {
    if (!userId || roleId === "buyer") return;

    setDeactivating(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("role", roleId);
      if (error) throw error;

      const { data: refreshedRoles } = await supabase.rpc("get_user_roles", { lookup_user_id: userId });
      const finalRoles: DashboardRole[] = ((refreshedRoles as DashboardRole[]) ?? []).filter(r => r !== roleId);
      useUserStore.setState({ activeRoles: finalRoles.length ? finalRoles : ["buyer"] });

      const nextMeta = { ...roleMeta };
      delete nextMeta[roleId];
      saveMeta(nextMeta);

      setDrawerRole(null);
      const label = ALL_ROLES.find(r => r.id === roleId)?.label ?? roleId;
      toast.success(`${label} deactivated.`);
    } catch (err: any) {
      console.error("[RolesPage] deactivation failed:", err);
      toast.error(err.message || "Deactivation failed.");
    } finally {
      setDeactivating(false);
    }
  }

  const drawerRoleDef = drawerRole ? ALL_ROLES.find(r => r.id === drawerRole) : null;

  if (pageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Loading roles…</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background animate-in fade-in duration-400 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 space-y-8 relative z-10">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="icon"
                className="h-9 w-9 rounded-xl border border-border bg-card shadow-sm hover:bg-muted transition-all active:scale-95 shrink-0">
                <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Account roles</h1>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">
                  Activate paths to earn and grow
                </p>
              </div>
            </div>
            <ProgressRing active={activeRoles.length} total={ALL_ROLES.length} />
          </div>

          {/* ── Roles grid ── */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-0.5">
              Choose your roles
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_ROLES.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  isActive={activeRoles.includes(role.id)}
                  isLoading={loadingRoles.has(role.id)}
                  meta={roleMeta[role.id]}
                  onActivate={() => activateRole(role.id, role.setupPath)}
                  onOpenDrawer={() => setDrawerRole(role.id)}
                />
              ))}
            </div>
          </div>

          {/* ── Active roles summary (shown when ≥2 roles active) ── */}
          {activeRoles.length >= 2 && (
            <div className="px-4 py-4 rounded-2xl border border-border bg-card animate-in fade-in duration-300">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Active roles summary
              </p>
              <div className="divide-y divide-border/50">
                {ALL_ROLES.filter(r => activeRoles.includes(r.id)).map(r => {
                  const c = COLOR_MAP[r.color];
                  const Icon = r.icon;
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-3.5 w-3.5", c.icon)} />
                        <span className="text-[12px] font-medium">{r.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {roleMeta[r.id]?.activatedAt && (
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            Since {formatDate(roleMeta[r.id]!.activatedAt!)}
                          </span>
                        )}
                        <button
                          onClick={() => setDrawerRole(r.id)}
                          className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          Manage <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Info notice ── */}
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border bg-card">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[12px] font-semibold mb-0.5">Roles can be changed anytime</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Activating a role doesn't lock you in — your data and settings are preserved if you deactivate. Switch roles freely from this page.
              </p>
            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div className="flex items-center justify-between gap-4 px-6 py-6 rounded-2xl bg-foreground text-background">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest opacity-40 mb-1">Need help?</p>
              <p className="text-[15px] font-semibold tracking-tight">Explore guides and tutorials</p>
            </div>
            <Button asChild
              className="h-9 px-5 rounded-xl border border-white/20 bg-white/10 text-background hover:bg-white/20 font-semibold text-[10px] uppercase tracking-widest shrink-0 transition-all active:scale-95">
              <Link href="/help">
                <BookOpen className="h-3 w-3 mr-1.5" /> View docs
              </Link>
            </Button>
          </div>

        </div>
      </div>

      {/* ── Role settings drawer (portal-style) ── */}
      {drawerRole && drawerRoleDef && (
        <RoleDrawer
          role={drawerRoleDef}
          isActive={activeRoles.includes(drawerRole)}
          meta={roleMeta[drawerRole]}
          onClose={() => setDrawerRole(null)}
          onDeactivate={() => deactivateRole(drawerRole)}
          deactivating={deactivating}
        />
      )}
    </>
  );
}