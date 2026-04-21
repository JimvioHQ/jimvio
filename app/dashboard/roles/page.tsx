"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package, Link2, Video, ShoppingBag, CheckCircle,
  ArrowRight, Crown, Loader2, Sparkles, Rocket, Users, ShieldCheck, ArrowLeft, RefreshCw
} from "lucide-react";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/lib/store/use-user-store";
import { type DashboardRole } from "@/components/dashboard/sidebar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RoleStatus = "active" | "inactive" | "loading";

interface RoleState {
  buyer:      RoleStatus;
  vendor:     RoleStatus;
  affiliate:  RoleStatus;
  influencer: RoleStatus;
}

const allRoles = [
  {
    id: "buyer" as const,
    label: "Aesthetic Buyer",
    icon: <ShoppingBag className="h-6 w-6" />,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    badge: "Public Access",
    description: "Shop for curated products from verified creators and vendors around the globe.",
    features: ["500K+ Products", "Order Tracking", "Digital Assets", "Wishlist Support"],
    alwaysActive: true,
    setupPath: null,
  },
  {
    id: "vendor" as const,
    label: "Business Vendor",
    icon: <Package className="h-6 w-6" />,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    badge: "Merchant Tools",
    description: "List your products, manage inventory, and handle orders with a professional dashboard.",
    features: ["Custom Storefront", "Inventory Manager", "Order Management", "Fast Payouts"],
    alwaysActive: false,
    setupPath: "/dashboard/activate/vendor",
  },
  {
    id: "affiliate" as const,
    label: "Growth Partner",
    icon: <Link2 className="h-6 w-6" />,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    badge: "Earn Commission",
    description: "Share products you love and earn a percentage of every sale you generate.",
    features: ["Link Generator", "Sales Tracking", "Instant Earnings", "Top Products Hub"],
    alwaysActive: false,
    setupPath: null,
  },
  {
    id: "influencer" as const,
    label: "Content Creator",
    icon: <Video className="h-6 w-6" />,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    badge: "UGC Missions",
    description: "Collaborate with brands on live missions. Create content and monetize your influence.",
    features: ["Live Missions", "Brand Collaborations", "Video Uploads", "Campaign Bonuses"],
    alwaysActive: false,
    setupPath: null,
  },
];

export default function RolesPage() {
  const router = useRouter();
  const { activeRoles, fetchRoles, addRole } = useUserStore();
  const [roleLocalStatus, setRoleLocalStatus] = useState<Record<string, RoleStatus>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      await fetchRoles();
      setLoading(false);
    }
    init();
  }, [router, fetchRoles]);

  async function activateRole(roleId: keyof RoleState, setupPath: string | null) {
    if (!userId || activeRoles.includes(roleId)) return;

    setRoleLocalStatus(prev => ({ ...prev, [roleId]: "loading" }));
    const supabase = createClient();

    try {
      if (roleId === "vendor") {
         router.push(setupPath || "/dashboard/activate/vendor");
         return;
      }

      const { error: upsertError } = await supabase.from("user_roles").upsert(
        { user_id: userId, role: roleId, is_active: true },
        { onConflict: "user_id,role" }
      );

      if (upsertError) throw upsertError;

      if (roleId === "affiliate") {
        const { error } = await supabase.from("affiliates").upsert({ user_id: userId }, { onConflict: "user_id" });
        if (error) throw error;
      } else if (roleId === "influencer") {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
        const { error } = await supabase.from("influencers").upsert({
          user_id:      userId,
          display_name: prof?.full_name ?? "Influencer",
        }, { onConflict: "user_id" });
        if (error) throw error;
      }

      const { data: refreshedRoles, error: fetchErr } = await supabase.rpc('get_user_roles', { lookup_user_id: userId });
      
      let finalRoles: DashboardRole[] = refreshedRoles as DashboardRole[] || ["buyer"];
      if (!finalRoles.includes(roleId)) {
        finalRoles = [...finalRoles, roleId];
      }
      
      useUserStore.setState({ activeRoles: finalRoles });

      setRoleLocalStatus(prev => ({ ...prev, [roleId]: "active" }));
      toast.success(`${roleId.charAt(0).toUpperCase() + roleId.slice(1)} role activated!`);
    } catch (err: any) {
      console.error("[RolesPage] activation failed:", err);
      toast.error(err.message || "Activation failed");
      setRoleLocalStatus(prev => ({ ...prev, [roleId]: "inactive" }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest pl-1">Loading Roles...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden bg-background">
      <div className="max-w-4xl mx-auto space-y-8 px-6 pt-10 relative z-10">
        
        {/* Header - Simpler */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <Button asChild variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-none bg-surface dark:bg-surface-secondary border border-border shadow-none hover:bg-surface dark:hover:bg-zinc-700 active:scale-95 transition-all text-stone-500 dark:text-text-muted">
                 <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
               </Button>
               <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">Account Roles</h1>
                  <p className="text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest leading-none pl-0.5">Activate paths to earn and grow</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 rounded-none bg-surface dark:bg-surface-secondary border border-border shadow-none">
               <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted">{activeRoles.length} Active</span>
            </div>
         </div>

        {/* Roles Grid - Softer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allRoles.map((r) => {
            const isActive  = activeRoles.includes(r.id);
            const isLoading = roleLocalStatus[r.id] === "loading";

            return (
              <GlassCard key={r.id} className={cn(
                 "p-8 rounded-none border-border transition-all duration-300 relative overflow-hidden flex flex-col h-full",
                 isActive ? "bg-surface dark:bg-surface-secondary shadow-none ring-1 ring-emerald-500/20" : "bg-surface/60 dark:bg-surface-secondary/40 hover:bg-surface/80 dark:hover:bg-zinc-800 shadow-none"
              )}>
                  <div className="flex items-center justify-between mb-8">
                     <div className={cn(
                        "w-12 h-12 rounded-none flex items-center justify-center shrink-0 border border-border bg-white dark:bg-surface shadow-none",
                        isActive ? "bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white" : cn(r.bg, r.color)
                     )}>
                        {r.icon}
                     </div>
                    {isActive ? (
                       <GlassPill color="emerald" className="px-3 py-1 text-[8px] font-bold border-none shadow-none uppercase tracking-widest bg-emerald-50 text-emerald-600">Active</GlassPill>
                    ) : (
                       <GlassPill color="orange" className="px-3 py-1 text-[8px] font-bold border-none shadow-none uppercase tracking-widest bg-orange-50 text-orange-600">{r.badge}</GlassPill>
                    )}
                 </div>

                  <div className="space-y-2 mb-6">
                     <h3 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">{r.label}</h3>
                     <p className="text-[13px] font-medium text-stone-500 dark:text-text-muted leading-relaxed">
                        {r.description}
                     </p>
                  </div>

                  <div className="space-y-2.5 mb-10 flex-1">
                     {r.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 text-[11px] font-bold text-stone-400 dark:text-text-muted">
                           <CheckCircle className="h-3.5 w-3.5 text-stone-200 dark:text-zinc-800 dark:text-text-secondary" />
                           {f}
                        </div>
                     ))}
                  </div>

                  {isActive ? (
                     <Button variant="outline" asChild className="w-full h-11 rounded-none border-border text-stone-900 dark:text-white font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                        <Link href="/dashboard">View Dashboard <ArrowRight className="h-3 w-3 ml-2" /></Link>
                     </Button>
                  ) : (
                     <Button
                        onClick={() => activateRole(r.id, r.setupPath)}
                        disabled={isLoading}
                        className="w-full h-11 rounded-none bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white hover:bg-black dark:hover:bg-stone-200 font-bold text-[10px] uppercase tracking-widest shadow-none active:scale-95 transition-all border-none"
                     >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-3.5 w-3.5 mr-2" />}
                        Activate Role
                     </Button>
                  )}
              </GlassCard>
            );
          })}
        </div>
        
        {/* Support Section - Soft */}
        <div className="p-8 text-center rounded-none bg-stone-900 dark:bg-surface-secondary text-white relative overflow-hidden shadow-none border border-white/10">
           <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-none" />
           <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mb-2">Need help?</p>
           <h3 className="text-xl font-bold tracking-tight mb-6">Explore our guides and tutorials</h3>
           <Button asChild className="h-11 px-8 rounded-none bg-white dark:bg-surface text-stone-900 dark:text-white font-bold text-[10px] uppercase tracking-widest shadow-none hover:bg-stone-50 dark:bg-surface/50 active:scale-95 transition-all border-none">
              <Link href="/help">View Documentation</Link>
           </Button>
        </div>
      </div>
    </div>
  );
}

