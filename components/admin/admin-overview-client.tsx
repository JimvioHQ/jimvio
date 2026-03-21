"use client";

import React from "react";
import { Users, Store, Package, ShoppingCart, DollarSign, UsersRound, ShieldCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { RevenueChart } from "@/components/charts/revenue-chart";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Stats = {
  totalUsers: number;
  totalVendors: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeCommunities: number;
  pendingVerifications: number;
};

type ChartPoint = { month: string; revenue: number; orders?: number };

export function AdminOverviewClient({ stats, chartData }: { stats: Stats; chartData: ChartPoint[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Admin Dashboard</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Platform overview and management</p>
        </div>
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Admin
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" />
        <StatCard title="Vendors" value={stats.totalVendors.toLocaleString()} icon={<Store className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Products" value={stats.totalProducts.toLocaleString()} icon={<Package className="h-4 w-4" />} iconColor="from-violet-600 to-purple-600" />
        <StatCard title="Orders (30d)" value={stats.totalOrders.toLocaleString()} icon={<ShoppingCart className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
        <StatCard title="Revenue (30d)" value={formatCurrency(stats.monthlyRevenue)} icon={<DollarSign className="h-4 w-4" />} iconColor="from-green-600 to-emerald-600" />
        <StatCard title="Communities" value={stats.activeCommunities.toLocaleString()} icon={<UsersRound className="h-4 w-4" />} iconColor="from-pink-600 to-rose-600" />
      </div>

      {stats.pendingVerifications > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">{stats.pendingVerifications} pending verification(s)</p>
                <p className="text-sm text-[var(--color-text-muted)]">Vendor applications awaiting review</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/admin/verifications">Review</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--color-accent)]" />
            Revenue trend (12 months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} height={280} type="area" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/users">Manage users</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/vendors">Manage vendors</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/products">Manage products</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/orders">View orders</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platform summary</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-[var(--color-text-muted)]">Total revenue (all time)</dt>
              <dd className="font-semibold text-right">{formatCurrency(stats.totalRevenue)}</dd>
              <dt className="text-[var(--color-text-muted)]">Monthly revenue</dt>
              <dd className="font-semibold text-right">{formatCurrency(stats.monthlyRevenue)}</dd>
              <dt className="text-[var(--color-text-muted)]">Orders (30 days)</dt>
              <dd className="font-semibold text-right">{stats.totalOrders}</dd>
              <dt className="text-[var(--color-text-muted)]">Pending verifications</dt>
              <dd className="font-semibold text-right">{stats.pendingVerifications}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
