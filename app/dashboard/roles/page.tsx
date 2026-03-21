"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package, Link2, Video, Users, ShoppingBag, CheckCircle,
  ArrowRight, Zap, Crown, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type RoleStatus = "active" | "inactive" | "loading";

interface RoleState {
  buyer:      RoleStatus;
  vendor:     RoleStatus;
  affiliate:  RoleStatus;
  influencer: RoleStatus;
  community:  RoleStatus;
}

const allRoles = [
  {
    id: "buyer" as const,
    label: "Buyer",
    icon: <ShoppingBag className="h-6 w-6" />,
    color: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    badge: "Active by default",
    badgeVariant: "success" as const,
    description: "Access the full marketplace. Buy physical and digital products from verified vendors.",
    features: ["Access 500K+ products", "Order tracking", "Digital downloads", "Wishlist", "Reviews"],
    alwaysActive: true,
    setupPath: null,
  },
  {
    id: "vendor" as const,
    label: "Vendor",
    icon: <Package className="h-6 w-6" />,
    color: "bg-[var(--color-accent-light)] text-[var(--color-accent)]",
    badge: "Free to activate",
    badgeVariant: "default" as const,
    description: "Open your own storefront. Sell physical or digital products globally. Manage inventory and get paid fast.",
    features: ["Product catalog", "Order management", "Inventory tracking", "Affiliate programs", "Analytics", "Irembopay payouts"],
    alwaysActive: false,
    setupPath: "/dashboard/vendor/setup",
  },
  {
    id: "affiliate" as const,
    label: "Affiliate",
    icon: <Link2 className="h-6 w-6" />,
    color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    badge: "Earn up to 50%",
    badgeVariant: "success" as const,
    description: "Generate unique affiliate links. Earn commissions automatically on every sale you drive.",
    features: ["Unlimited links", "Click & conversion tracking", "Auto commissions", "Leaderboard", "Instant withdrawal"],
    alwaysActive: false,
    setupPath: null,
  },
  {
    id: "influencer" as const,
    label: "Influencer",
    icon: <Video className="h-6 w-6" />,
    color: "bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
    badge: "Promote & earn",
    badgeVariant: "accent" as const,
    description: "Join vendor campaigns. Download marketing clips, share on your platforms, earn per conversion.",
    features: ["Browse campaigns", "Download viral clips", "Multi-platform tracking", "Campaign earnings"],
    alwaysActive: false,
    setupPath: null,
  },
  {
    id: "community" as const,
    label: "Community Owner",
    icon: <Users className="h-6 w-6" />,
    color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    badge: "Recurring income",
    badgeVariant: "warning" as const,
    description: "Launch a paid community. Monthly, yearly, or lifetime plans. Build a recurring income stream.",
    features: ["Custom community page", "Subscription plans", "Exclusive posts", "Member management", "Analytics"],
    alwaysActive: false,
    setupPath: "/dashboard/community/setup",
  },
];

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleState>({
    buyer: "active", vendor: "inactive", affiliate: "inactive",
    influencer: "inactive", community: "inactive",
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const [userRolesRes, vendorRes, affiliateRes, influencerRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("influencers").select("id").eq("user_id", user.id).maybeSingle(),
      ]);

      const activeRoles = userRolesRes.data?.map(r => r.role) ?? ["buyer"];
      setRoles({
        buyer:      "active",
        vendor:     (vendorRes.data || activeRoles.includes("vendor")) ? "active" : "inactive",
        affiliate:  (affiliateRes.data || activeRoles.includes("affiliate")) ? "active" : "inactive",
        influencer: (influencerRes.data || activeRoles.includes("influencer")) ? "active" : "inactive",
        community:  activeRoles.includes("community_owner") ? "active" : "inactive",
      });
      setLoading(false);
    }
    loadRoles();
  }, [router]);

  async function activateRole(roleId: keyof RoleState, setupPath: string | null) {
    if (!userId || roles[roleId] === "active") return;

    setRoles(prev => ({ ...prev, [roleId]: "loading" }));
    const supabase = createClient();

    try {
      // Add role to user_roles
      await supabase.from("user_roles").upsert(
        { user_id: userId, role: roleId === "community" ? "community_owner" : roleId },
        { onConflict: "user_id,role" }
      );

      // Create the role-specific record
      if (roleId === "affiliate") {
        const { error } = await supabase.from("affiliates").insert({ user_id: userId }).select().single();
        if (!error) {
          setRoles(prev => ({ ...prev, affiliate: "active" }));
        }
      } else if (roleId === "influencer") {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
        await supabase.from("influencers").insert({
          user_id:      userId,
          display_name: prof?.full_name ?? "Influencer",
        });
        setRoles(prev => ({ ...prev, influencer: "active" }));
      } else if (roleId === "vendor" && setupPath) {
        // Vendor needs full setup form
        router.push(setupPath);
        return;
      } else if (roleId === "community" && setupPath) {
        router.push(setupPath);
        return;
      }

      setRoles(prev => ({ ...prev, [roleId]: "active" }));
    } catch {
      setRoles(prev => ({ ...prev, [roleId]: "inactive" }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  const activeCount = Object.values(roles).filter(v => v === "active").length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Activate Roles</h1>
        <p className="text-sm text-muted-c mt-1">
          {activeCount} of {allRoles.length} roles active — Activate any combination to unlock additional income streams.
        </p>
      </div>

      {/* Active roles summary */}
      {activeCount > 1 && (
        <div className="flex flex-wrap gap-2">
          {allRoles.filter(r => roles[r.id] === "active").map(r => (
            <span key={r.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${r.color}`}>
              {r.icon && React.cloneElement(r.icon as React.ReactElement<{ className?: string }>, { className: "h-3.5 w-3.5" })}
              {r.label} <CheckCircle className="h-3 w-3" />
            </span>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30 rounded-xl px-4 py-3 flex items-start gap-3">
        <Crown className="h-5 w-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">One account, all roles</p>
          <p className="text-xs text-muted-c mt-0.5">
            Activate roles below, then switch between them using the role switcher in the sidebar. Each role unlocks a dedicated dashboard.
          </p>
        </div>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {allRoles.map((r) => {
          const status = roles[r.id];
          const isActive  = status === "active";
          const isLoading = status === "loading";

          return (
            <Card key={r.id} className={isActive ? "ring-2 ring-[var(--color-accent)]/30" : ""}>
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${r.color}`}>
                      {r.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-[var(--color-text-primary)]">{r.label}</h3>
                        {isActive && (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle className="h-2.5 w-2.5" /> Active
                          </Badge>
                        )}
                      </div>
                      <Badge variant={r.badgeVariant} className="text-xs">{r.badge}</Badge>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-c mb-3 leading-relaxed">{r.description}</p>

                {/* Features */}
                <ul className="space-y-1 mb-4">
                  {r.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-c">
                      <CheckCircle className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {/* Action */}
                {isActive ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
                    <CheckCircle className="h-4 w-4" /> This role is active
                    {r.id !== "buyer" && (
                      <Link href="/dashboard" className="ml-auto text-xs text-muted-c hover:text-[var(--color-text-primary)] underline">
                        Go to dashboard →
                      </Link>
                    )}
                  </div>
                ) : (
                  <Button
                    className="w-full justify-center"
                    loading={isLoading}
                    onClick={() => activateRole(r.id, r.setupPath)}
                  >
                    {isLoading ? "Activating..." : `Activate ${r.label} Role`}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
