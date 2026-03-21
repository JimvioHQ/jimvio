"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  DollarSign,
  Eye,
  MessageSquare,
  Globe,
  Plus,
  Link2,
  Video,
  Users,
  ArrowRight,
  MessageCircle,
  Store,
  Truck,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const quickActions = [
  { label: "Browse Marketplace", href: "/dashboard/marketplace", icon: <Globe className="h-5 w-5" />, color: "bg-[var(--color-accent-light)] text-[var(--color-accent)]" },
  { label: "Upload Product", href: "/dashboard/products/new", icon: <Plus className="h-5 w-5" />, color: "bg-emerald-100 text-emerald-600" },
  { label: "Generate Affiliate Link", href: "/dashboard/links", icon: <Link2 className="h-5 w-5" />, color: "bg-blue-100 text-blue-600" },
  { label: "Create Product Clip", href: "/dashboard/campaigns/browse", icon: <Video className="h-5 w-5" />, color: "bg-pink-100 text-pink-600" },
  { label: "Join Community", href: "/communities", icon: <Users className="h-5 w-5" />, color: "bg-amber-100 text-amber-600" },
];

const vendorQuickActions = [
  { label: "Add New Product", href: "/dashboard/products/new", icon: <Plus className="h-5 w-5" />, color: "bg-emerald-100 text-emerald-600" },
  { label: "Manage Products", href: "/dashboard/products", icon: <Package className="h-5 w-5" />, color: "bg-blue-100 text-blue-600" },
  { label: "View Orders", href: "/dashboard/vendor/orders", icon: <Truck className="h-5 w-5" />, color: "bg-amber-100 text-amber-600" },
  { label: "Edit Store", href: "/dashboard/vendor/store", icon: <Pencil className="h-5 w-5" />, color: "bg-violet-100 text-violet-600" },
];

type ActivityType = "viewed_product" | "uploaded_product" | "affiliate_link" | "posted_discussion";
const activityIcons: Record<ActivityType, React.ReactNode> = {
  viewed_product: <Package className="h-4 w-4" />,
  uploaded_product: <Package className="h-4 w-4" />,
  affiliate_link: <Link2 className="h-4 w-4" />,
  posted_discussion: <MessageCircle className="h-4 w-4" />,
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<{ full_name?: string | null } | null>(null);
  const [stats, setStats] = useState({
    orders: 0,
    productsListed: 0,
    affiliateEarnings: 0,
    videoViews: 0,
    communityPosts: 0,
    communitiesJoined: 0,
    communityReputation: 0,
    vendorOrders: 0,
    vendorRevenue: 0,
    vendorFollowers: 0,
  });
  const [isVendor, setIsVendor] = useState(false);
  const [activity, setActivity] = useState<{ type: ActivityType; label: string; time: string; href?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setProfile(prof);

      const [vendorRes, affiliateRes, ordersRes] = await Promise.all([
        supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("affiliates").select("id, total_earnings").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
      ]);

      let productsListed = 0;
      let vendorOrders = 0;
      let vendorRevenue = 0;
      let vendorFollowers = 0;
      if (vendorRes.data) {
        setIsVendor(true);
        const [prodCount, orderItems, followCount] = await Promise.all([
          supabase.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", vendorRes.data.id).eq("is_active", true),
          supabase.from("order_items").select("total_price").eq("vendor_id", vendorRes.data.id),
          supabase.from("vendor_followers").select("id", { count: "exact", head: true }).eq("vendor_id", vendorRes.data.id),
        ]);
        productsListed = prodCount.count ?? 0;
        vendorOrders = orderItems.data?.length ?? 0;
        vendorRevenue = orderItems.data?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0;
        vendorFollowers = followCount.count ?? 0;
      }

      const affiliateEarnings = Number(affiliateRes.data?.total_earnings ?? 0);
      const orders = ordersRes.count ?? 0;

      const [communityMembersRes, communityPostsRes] = await Promise.all([
        supabase.from("community_members").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("subscription_status", "active"),
        supabase.from("community_posts").select("id, like_count").eq("author_id", user.id),
      ]);
      const communitiesJoined = communityMembersRes.count ?? 0;
      const communityPosts = communityPostsRes.data?.length ?? 0;
      const communityReputation = communityPostsRes.data?.reduce((sum, p) => sum + (p.like_count ?? 0), 0) ?? 0;

      setStats({
        orders,
        productsListed,
        affiliateEarnings,
        videoViews: 0,
        communityPosts,
        communitiesJoined,
        communityReputation,
        vendorOrders,
        vendorRevenue,
        vendorFollowers,
      });

      const recent: { type: ActivityType; label: string; time: string; href?: string }[] = [];
      const ordersList = await supabase.from("orders").select("id, created_at").eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(3);
      ordersList.data?.forEach((o) => {
        recent.push({ type: "viewed_product", label: "Order placed", time: new Date(o.created_at).toLocaleDateString(), href: "/dashboard/orders" });
      });
      if (vendorRes.data) {
        const prods = await supabase.from("products").select("id, name, created_at").eq("vendor_id", vendorRes.data.id).order("created_at", { ascending: false }).limit(2);
        prods.data?.forEach((p) => {
          recent.push({ type: "uploaded_product", label: `Uploaded: ${p.name}`, time: new Date(p.created_at).toLocaleDateString(), href: "/dashboard/products" });
        });
      }
      const communityPostsList = await supabase.from("community_posts").select("id, title, created_at").eq("author_id", user.id).order("created_at", { ascending: false }).limit(2);
      communityPostsList.data?.forEach((p) => {
        recent.push({ type: "posted_discussion", label: p.title ? `Post: ${p.title}` : "Posted in community", time: new Date(p.created_at).toLocaleDateString(), href: "/dashboard/community/posts" });
      });
      recent.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(recent.slice(0, 8));
      setLoading(false);
    }
    load();
  }, []);

  const userName = (profile?.full_name as string)?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-4 sm:p-5 shadow-sm max-lg:shadow-md">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[var(--color-accent)]/15 blur-2xl"
          aria-hidden
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">Overview</p>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)] leading-relaxed max-w-lg">
          Your orders, store, affiliates, and community — one place.
        </p>
      </div>

      {/* Vendor overview (when user is vendor) */}
      {isVendor && (
        <section>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 sm:mb-4 flex items-center gap-2">
            <Store className="h-4 w-4 shrink-0 text-[var(--color-accent)]" /> Vendor overview
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <StatCard title="Total Products" value={stats.productsListed} icon={<Package className="h-4 w-4" />} iconColor="from-[var(--color-accent)] to-amber-600" className="shadow-sm hover:shadow-md transition-shadow" />
                <StatCard title="Orders Received" value={stats.vendorOrders} icon={<Truck className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" className="shadow-sm hover:shadow-md transition-shadow" />
                <StatCard title="Revenue" value={formatCurrency(stats.vendorRevenue)} icon={<DollarSign className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" className="shadow-sm hover:shadow-md transition-shadow" />
                <StatCard title="Store Followers" value={stats.vendorFollowers} icon={<Users className="h-4 w-4" />} iconColor="from-violet-600 to-purple-600" className="shadow-sm hover:shadow-md transition-shadow" />
              </div>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-3 sm:mt-4">
                {vendorQuickActions.map((action, i) => (
                  <Link key={i} href={action.href} className="block min-h-[44px] touch-manipulation">
                    <Card className="h-full rounded-2xl border-[var(--color-border)] shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200 group cursor-pointer active:scale-[0.99]">
                      <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
                        <div className={cn("p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105", action.color)}>
                          {action.icon}
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{action.label}</span>
                        <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] ml-auto shrink-0 group-hover:text-[var(--color-accent)]" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Overview cards */}
      <section>
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 sm:mb-4">
          Overview
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
            <StatCard title="Orders" value={stats.orders} icon={<ShoppingCart className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" className="shadow-sm hover:shadow-md transition-shadow" />
            <StatCard title="Products Listed" value={stats.productsListed} icon={<Package className="h-4 w-4" />} iconColor="from-[var(--color-accent)] to-amber-600" className="shadow-sm hover:shadow-md transition-shadow" />
            <StatCard title="Affiliate Earnings" value={formatCurrency(stats.affiliateEarnings)} icon={<DollarSign className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" className="shadow-sm hover:shadow-md transition-shadow" />
            <StatCard title="Video Views" value={stats.videoViews.toLocaleString()} icon={<Eye className="h-4 w-4" />} iconColor="from-pink-600 to-rose-600" className="shadow-sm hover:shadow-md transition-shadow" />
            <StatCard title="Community Posts" value={stats.communityPosts} icon={<MessageSquare className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" className="shadow-sm hover:shadow-md transition-shadow" />
          </div>
        )}
      </section>

      {/* Community profile: joined, posts, reputation */}
      {(stats.communitiesJoined > 0 || stats.communityPosts > 0) && (
        <section>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 sm:mb-4 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 shrink-0 text-[var(--color-accent)]" /> Community
          </h2>
          <Card className="rounded-2xl border-[var(--color-border)] shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-black text-[var(--color-text-primary)]">{stats.communitiesJoined}</p>
                  <p className="text-xs text-[var(--color-text-muted)] font-medium">Communities joined</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[var(--color-text-primary)]">{stats.communityPosts}</p>
                  <p className="text-xs text-[var(--color-text-muted)] font-medium">Posts created</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[var(--color-accent)]">{stats.communityReputation}</p>
                  <p className="text-xs text-[var(--color-text-muted)] font-medium">Reputation (likes)</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-2">
                <Link href="/communities/hub">
                  <Button variant="outline" size="sm" className="rounded-xl">Hub</Button>
                </Link>
                <Link href="/dashboard/community/posts">
                  <Button variant="outline" size="sm" className="rounded-xl">My Posts</Button>
                </Link>
                <Link href="/communities">
                  <Button variant="outline" size="sm" className="rounded-xl">Discover</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Quick Actions — horizontal swipe on small screens */}
      <section>
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 sm:mb-4">
          Quick actions
        </h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-0.5 px-0.5 snap-x snap-mandatory lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="snap-center shrink-0 w-[min(100%,17.5rem)] lg:w-auto lg:shrink lg:min-w-0 touch-manipulation"
            >
              <Card className="h-full rounded-2xl border-[var(--color-border)] shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200 group cursor-pointer active:scale-[0.99]">
                <CardContent className="p-3.5 sm:p-4 flex items-center gap-3 min-h-[3.5rem]">
                  <div className={cn("p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105", action.color)}>
                    {action.icon}
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{action.label}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] ml-auto shrink-0 group-hover:text-[var(--color-accent)]" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 sm:mb-4">
          Recent activity
        </h2>
        <Card className="rounded-2xl border-[var(--color-border)] shadow-sm overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-5">
            <CardTitle className="text-base font-semibold text-[var(--color-text-primary)]">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:px-4 sm:pb-4">
            {activity.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-8 px-2 text-center">No recent activity yet.</p>
            ) : (
              <ul className="space-y-0">
                {activity.map((item, i) => (
                  <li key={i}>
                    <Link
                      href={item.href ?? "#"}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors min-h-[52px] touch-manipulation",
                        item.href ? "hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-surface-secondary)]" : ""
                      )}
                    >
                      <div className="h-8 w-8 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
                        {activityIcons[item.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{item.time}</p>
                      </div>
                      {item.href && <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
