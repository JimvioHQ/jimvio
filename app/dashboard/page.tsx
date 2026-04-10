"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart, Package, DollarSign, Globe, Plus, Link2, Video, ArrowRight,
  Store, Truck, Wallet, Heart, TrendingUp, Zap, Crown, BarChart2, Users,
  Star, Clock, CheckCircle, ArrowUpRight, Sparkles, Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { groupOrderLineRowsToCartOrders } from "@/lib/currency/format";
import { useUserStore } from "@/lib/store/use-user-store";

/* ──────────── Types ──────────── */
interface DashStats {
  orders: number;
  wishlist: number;
  affiliateEarnings: number;
  vendorRevenue: number;
  vendorOrders: number;
  vendorProducts: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
}

/* ──────────── Small helpers ──────────── */
function StatBadge({ value, label, icon, gradient }: {
  value: string | number; label: string;
  icon: React.ReactNode; gradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-10 blur-2xl", gradient)} />
      <div className={cn("mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg", gradient)}>
        {icon}
      </div>
      <p className="text-2xl font-black text-[var(--color-text-primary)]">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
    </div>
  );
}

function QuickAction({ href, icon, label, sublabel, color }: {
  href: string; icon: React.ReactNode; label: string; sublabel?: string; color: string;
}) {
  return (
    <Link href={href} className="group">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-accent)]/40 hover:shadow-md">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{label}</p>
          {sublabel && <p className="text-xs text-[var(--color-text-muted)] truncate">{sublabel}</p>}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-accent)]" />
      </div>
    </Link>
  );
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  delivered:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  confirmed:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  processing: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  shipped:    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  pending:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

/* ──────────── Main Page ──────────── */
export default function DashboardPage() {
  const { formatCartTotalsLabel } = useCurrency();
  const { activeRoles, fetchRoles } = useUserStore();
  const [profile, setProfile] = useState<{ full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [stats, setStats] = useState<DashStats>({
    orders: 0, wishlist: 0, affiliateEarnings: 0,
    vendorRevenue: 0, vendorOrders: 0, vendorProducts: 0,
  });
  const [vendorRevenueRows, setVendorRevenueRows] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profileRes = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
      if (profileRes.data) setProfile(profileRes.data);
      await fetchRoles();

      const [ordersRes, wishlistRes, affiliateRes, recentRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
        supabase.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("affiliates").select("total_earnings").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders")
          .select("id, order_number, status, total_amount, currency, created_at")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setRecentOrders((recentRes.data as RecentOrder[]) ?? []);

      let vendorRevenue = 0, vendorOrders = 0, vendorProducts = 0;

      if (activeRoles.includes("vendor")) {
        const vendor = await supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle();
        if (vendor.data) {
          const [pCount, oItems] = await Promise.all([
            supabase.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.data.id).eq("is_active", true),
            supabase.from("order_items").select("total_price, orders(currency)").eq("vendor_id", vendor.data.id),
          ]);
          vendorProducts = pCount.count ?? 0;
          vendorOrders = oItems.data?.length ?? 0;
          setVendorRevenueRows(oItems.data ?? []);
          vendorRevenue = oItems.data?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0;
        }
      }

      setStats({
        orders: ordersRes.count ?? 0,
        wishlist: wishlistRes.count ?? 0,
        affiliateEarnings: Number(affiliateRes.data?.total_earnings ?? 0),
        vendorRevenue, vendorOrders, vendorProducts,
      });
      setLoading(false);
    }
    load();
  }, [fetchRoles, activeRoles.length]); // eslint-disable-line

  const vendorRevenueLabel = useMemo(() => {
    if (!vendorRevenueRows.length) return "0 RWF";
    return formatCartTotalsLabel(groupOrderLineRowsToCartOrders(vendorRevenueRows));
  }, [vendorRevenueRows, formatCartTotalsLabel]);

  const firstName = (profile?.full_name as string)?.split(" ")[0] ?? "there";
  const isVendor = activeRoles.includes("vendor");
  const isAffiliate = activeRoles.includes("affiliate");

  return (
    <div className="space-y-7 animate-fade-in pb-12">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-accent)] via-orange-500 to-amber-500 p-7 shadow-xl shadow-orange-500/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute right-24 bottom-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-100 flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5" /> {greeting}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {firstName} 👋
            </h1>
            <p className="mt-2 text-sm text-orange-100 font-medium max-w-md">
              You have <span className="font-bold text-white">{activeRoles.length} active role{activeRoles.length !== 1 ? "s" : ""}</span> on your account.
              {!isVendor && " Activate Vendor to start selling globally."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeRoles.map(r => (
                <span key={r} className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-bold text-white capitalize">
                  <CheckCircle className="h-3 w-3" /> {r}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 flex gap-2">
            <Link href="/dashboard/marketplace">
              <Button size="sm" className="rounded-xl bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-md">
                <Globe className="h-4 w-4" /> Shop
              </Button>
            </Link>
            {!isVendor && (
              <Link href="/dashboard/activate/vendor">
                <Button size="sm" variant="outline" className="rounded-xl border-white/40 text-white hover:bg-white/10 font-bold">
                  <Store className="h-4 w-4" /> Sell
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Buyer Stats ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-muted)]">Buyer Overview</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBadge value={loading ? "…" : stats.orders} label="My Orders" icon={<ShoppingCart className="h-5 w-5" />} gradient="bg-gradient-to-br from-blue-500 to-cyan-500" />
          <StatBadge value={loading ? "…" : stats.wishlist} label="Saved Items" icon={<Heart className="h-5 w-5" />} gradient="bg-gradient-to-br from-pink-500 to-rose-500" />
          <Link href="/dashboard/marketplace" className="col-span-1 group">
            <div className="h-full rounded-2xl border border-dashed border-[var(--color-accent)]/40 bg-[var(--color-accent-light)]/30 p-5 flex flex-col justify-between hover:bg-[var(--color-accent-light)]/60 transition-colors">
              <Globe className="h-6 w-6 text-[var(--color-accent)]" />
              <div>
                <p className="text-sm font-bold text-[var(--color-accent)]">Browse Products</p>
                <p className="text-xs text-[var(--color-text-muted)]">500K+ listings</p>
              </div>
            </div>
          </Link>
          <Link href="/dashboard/orders" className="col-span-1 group">
            <div className="h-full rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col justify-between hover:border-[var(--color-accent)]/40 transition-colors">
              <Truck className="h-6 w-6 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Track Orders</p>
                <p className="text-xs text-[var(--color-text-muted)]">View all orders</p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Vendor Section ── */}
      {isVendor && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-muted)]">Store Operations</h2>
            </div>
            <Link href="/dashboard/products" className="text-xs font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1">
              Manage all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <StatBadge value={loading ? "…" : vendorRevenueLabel} label="Total Revenue" icon={<DollarSign className="h-5 w-5" />} gradient="bg-gradient-to-br from-emerald-500 to-teal-500" />
            <StatBadge value={loading ? "…" : stats.vendorOrders} label="Orders Received" icon={<Truck className="h-5 w-5" />} gradient="bg-gradient-to-br from-amber-500 to-orange-500" />
            <StatBadge value={loading ? "…" : stats.vendorProducts} label="Active Products" icon={<Package className="h-5 w-5" />} gradient="bg-gradient-to-br from-violet-500 to-purple-500" />
            <StatBadge value="—" label="Avg. Rating" icon={<Star className="h-5 w-5" />} gradient="bg-gradient-to-br from-yellow-400 to-amber-500" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction href="/dashboard/products/new" icon={<Plus className="h-4 w-4" />} label="Add Product" sublabel="New listing" color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40" />
            <QuickAction href="/dashboard/vendor/orders" icon={<Truck className="h-4 w-4" />} label="View Orders" sublabel="Manage fulfillment" color="bg-amber-100 text-amber-600 dark:bg-amber-900/40" />
            <QuickAction href="/dashboard/products" icon={<Package className="h-4 w-4" />} label="Products" sublabel="Manage catalog" color="bg-blue-100 text-blue-600 dark:bg-blue-900/40" />
            <QuickAction href="/dashboard/payments" icon={<Wallet className="h-4 w-4" />} label="Payouts" sublabel="Withdraw earnings" color="bg-violet-100 text-violet-600 dark:bg-violet-900/40" />
          </div>
        </section>
      )}

      {/* ── Affiliate Section ── */}
      {isAffiliate && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-muted)]">Affiliate Hub</h2>
            </div>
            <Link href="/dashboard/links" className="text-xs font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1">
              Manage links <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <StatBadge value={loading ? "…" : `${stats.affiliateEarnings.toFixed(0)} RWF`} label="Total Earnings" icon={<DollarSign className="h-5 w-5" />} gradient="bg-gradient-to-br from-blue-500 to-indigo-500" />
            <StatBadge value="—" label="Total Clicks" icon={<Activity className="h-5 w-5" />} gradient="bg-gradient-to-br from-cyan-500 to-blue-500" />
            <StatBadge value="—" label="Conversions" icon={<TrendingUp className="h-5 w-5" />} gradient="bg-gradient-to-br from-teal-500 to-emerald-500" />
            <StatBadge value="—" label="Active Links" icon={<Link2 className="h-5 w-5" />} gradient="bg-gradient-to-br from-indigo-500 to-violet-500" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <QuickAction href="/dashboard/links" icon={<Link2 className="h-4 w-4" />} label="Generate Link" sublabel="Share & earn" color="bg-blue-100 text-blue-600" />
            <QuickAction href="/dashboard/earnings" icon={<DollarSign className="h-4 w-4" />} label="View Earnings" sublabel="Track commissions" color="bg-indigo-100 text-indigo-600" />
          </div>
        </section>
      )}



      {/* ── Activate Roles CTA (if not all unlocked) ── */}
      {activeRoles.length < 4 && (
        <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-gradient-to-r from-[var(--color-accent-light)]/40 to-transparent p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center shrink-0">
              <Crown className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">Unlock more income streams</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Role available to activate — earn as a Vendor or Affiliate.
              </p>
            </div>
          </div>
          <Link href="/dashboard/roles" className="shrink-0">
            <Button size="sm" className="rounded-xl font-bold">
              Activate <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── Bottom 2-col: Recent Orders + Quick Links ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Orders */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-text-muted)]" />
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-muted)]">Recent Orders</h2>
            </div>
            <Link href="/dashboard/orders" className="text-xs font-bold text-[var(--color-accent)] hover:underline">View all</Link>
          </div>
          <Card className="rounded-2xl border-[var(--color-border)] shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="py-10 text-center text-[var(--color-text-muted)] text-sm">Loading…</div>
              ) : recentOrders.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <ShoppingCart className="h-8 w-8 mx-auto text-[var(--color-text-muted)] opacity-30" />
                  <p className="text-sm text-[var(--color-text-muted)] font-medium">No orders yet</p>
                  <Link href="/dashboard/marketplace">
                    <Button size="sm" variant="secondary" className="rounded-xl mt-1">Browse Marketplace</Button>
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]/50">
                  {recentOrders.map(o => (
                    <li key={o.id}>
                      <Link href={`/dashboard/orders/${o.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--color-surface-secondary)] transition-colors group">
                        <div className="h-9 w-9 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center shrink-0">
                          <ShoppingCart className="h-4 w-4 text-[var(--color-text-muted)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">{o.order_number || `#${o.id.slice(0, 8)}`}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{new Date(o.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">{Number(o.total_amount).toLocaleString()} {o.currency}</p>
                          <span className={cn("inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", ORDER_STATUS_STYLES[o.status] ?? ORDER_STATUS_STYLES.pending)}>
                            {o.status}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Quick Navigate */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--color-text-muted)]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-muted)]">Quick Navigate</h2>
          </div>
          <div className="space-y-2">
            <QuickAction href="/dashboard/marketplace" icon={<Globe className="h-4 w-4" />} label="Browse Marketplace" sublabel="Discover 500K+ products" color="bg-[var(--color-accent-light)] text-[var(--color-accent)]" />
            <QuickAction href="/dashboard/wishlist" icon={<Heart className="h-4 w-4" />} label="Saved Products" sublabel="Your wishlist" color="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" />
            <QuickAction href="/dashboard/notifications" icon={<BarChart2 className="h-4 w-4" />} label="Notifications" sublabel="Stay updated" color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
            <QuickAction href="/communities" icon={<Users className="h-4 w-4" />} label="Communities" sublabel="Join or create communities" color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
            <QuickAction href="/dashboard/settings" icon={<Crown className="h-4 w-4" />} label="Profile & Settings" sublabel="Manage your account" color="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" />
          </div>
        </section>
      </div>
    </div>
  );
}
