"use client";

import React from "react";
import Link from "next/link";
import {
  Package,
  Link2,
  Video,
  Users,
  Store,
  FileText,
  ArrowRight,
  DollarSign,
  ShoppingCart,
  UserPlus,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

const quickActions = [
  { label: "Browse Marketplace", href: "/marketplace", icon: <Globe className="h-5 w-5" />, color: "bg-[var(--color-accent-light)] text-[var(--color-accent)]" },
  { label: "Post Buying Lead", href: "/requests", icon: <FileText className="h-5 w-5" />, color: "bg-blue-100 text-blue-600" },
  { label: "Become a Vendor", href: "/dashboard/vendor/setup", icon: <Store className="h-5 w-5" />, color: "bg-[var(--color-accent-light)] text-[var(--color-accent)]" },
  { label: "Promote Products (Affiliate)", href: "/dashboard/roles", icon: <Link2 className="h-5 w-5" />, color: "bg-emerald-100 text-emerald-600" },
  { label: "Create Product Clip", href: "/dashboard/campaigns/browse", icon: <Video className="h-5 w-5" />, color: "bg-pink-100 text-pink-600" },
  { label: "Join Communities", href: "/communities", icon: <Users className="h-5 w-5" />, color: "bg-amber-100 text-amber-600" },
];

const roleCards = [
  { id: "buyer", label: "Buyer", description: "Browse and buy from verified vendors. Active by default.", href: null, active: true },
  { id: "vendor", label: "Vendor", description: "Start selling products globally.", href: "/dashboard/vendor/setup", buttonLabel: "Apply as Vendor" },
  { id: "affiliate", label: "Affiliate", description: "Promote products and earn commission.", href: "/dashboard/roles", buttonLabel: "Activate Affiliate" },
  { id: "influencer", label: "Influencer / Creator", description: "Create clips and join campaigns.", href: "/dashboard/roles", buttonLabel: "Activate Creator" },
  { id: "community", label: "Community Member", description: "Join or create paid communities.", href: "/dashboard/roles", buttonLabel: "Join Communities" },
];

const onboardingCards = [
  { title: "How to start selling", description: "Set up your store, add products, and get paid.", href: "/help/selling", icon: <Store className="h-5 w-5" /> },
  { title: "How affiliate commissions work", description: "Earn when your links drive sales.", href: "/help/affiliate", icon: <DollarSign className="h-5 w-5" /> },
  { title: "How to create viral product clips", description: "Short videos that convert.", href: "/help/clips", icon: <Video className="h-5 w-5" /> },
];

interface ActivityStats {
  orders: number;
  products: number;
  affiliateEarnings: number;
  clipsUploaded: number;
  followers: number;
}

interface UniversalDashboardProps {
  userName: string;
  activity: ActivityStats;
  loading?: boolean;
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 animate-pulse">
      <div className="flex items-start justify-between mb-2">
        <div className="h-4 w-24 rounded bg-[var(--color-surface-secondary)]" />
        <div className="h-8 w-8 rounded-lg bg-[var(--color-surface-secondary)]" />
      </div>
      <div className="h-7 w-16 rounded bg-[var(--color-surface-secondary)]" />
    </div>
  );
}

export function UniversalDashboard({ userName, activity, loading }: UniversalDashboardProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Welcome section */}
      <section>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
          Welcome back, {userName} 👋
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-1 text-sm sm:text-base">
          Explore the marketplace, promote products, or start selling.
        </p>
        <p className="text-[var(--color-text-muted)] text-sm mt-0.5 max-w-xl">
          Jimvio is your multi-role B2B platform. Activate roles below to unlock selling, affiliate earnings, and creator tools.
        </p>
      </section>

      {/* 2. Quick Actions - horizontal scroll on mobile */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Quick Actions</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
          {quickActions.map((action, i) => (
            <Link key={i} href={action.href}>
              <div
                className={cn(
                  "min-w-[160px] md:min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4",
                  "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-accent)]/30",
                  "transition-all duration-200 cursor-pointer group flex items-center gap-3"
                )}
              >
                <div className={cn("p-2.5 rounded-lg shrink-0 transition-transform group-hover:scale-105", action.color)}>
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-[var(--color-text-primary)] leading-tight">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Your Activity Overview - stat cards with skeleton when loading */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Your Activity Overview</h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard title="Orders" value={activity.orders} icon={<ShoppingCart className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" />
            <StatCard title="Products" value={activity.products} icon={<Package className="h-4 w-4" />} iconColor="from-[var(--color-accent)] to-amber-600" />
            <StatCard title="Affiliate Earnings" value={formatCurrency(activity.affiliateEarnings)} icon={<DollarSign className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
            <StatCard title="Clips Uploaded" value={activity.clipsUploaded} icon={<Video className="h-4 w-4" />} iconColor="from-pink-600 to-rose-600" />
            <StatCard title="Followers" value={activity.followers} icon={<UserPlus className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
          </div>
        )}
      </section>

      {/* 4. Activate Your Roles */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Activate Your Roles</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">One account, multiple roles. Activate to unlock dashboards and features.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roleCards.map((r) => (
            <Card key={r.id} className="hover:border-[var(--color-accent)]/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-[var(--color-text-primary)]">{r.label}</h3>
                  {r.active && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)]">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mb-4 leading-relaxed">{r.description}</p>
                {r.href ? (
                  <Button asChild size="sm" className="w-full">
                    <Link href={r.href}>{r.buttonLabel} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)]">Default role</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. Onboarding helper cards */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Getting Started with Jimvio</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {onboardingCards.map((card, i) => (
            <Link key={i} href={card.href}>
              <Card className="h-full hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer group">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] shrink-0 group-hover:scale-105 transition-transform">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">{card.title}</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{card.description}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] mt-2">
                      Read guide <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function UniversalDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-64 bg-[var(--color-surface-secondary)] rounded-lg animate-pulse" />
      <div className="h-4 w-96 max-w-full bg-[var(--color-surface-secondary)] rounded animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
