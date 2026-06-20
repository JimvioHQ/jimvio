"use client";

import type { Campaign, Community, Product } from "@/types/dashboard";
import { TopCampaigns } from "@/components/dashboard/TopCampaigns";
import { TrendingProducts } from "@/components/dashboard/TrendingProducts";
import { YourCommunities } from "@/components/dashboard/YourCommunities";
import { cn } from "@/lib/utils";

interface DashboardDiscoveryGridProps {
  campaigns: Campaign[];
  products: Product[];
  communities: Community[];
  loading?: boolean;
  className?: string;
  /** Sidebar column is narrow — stack cards vertically */
  variant?: "default" | "sidebar";
}

function DiscoverySkeleton() {
  return (
    <>
      <div className="h-64 animate-pulse rounded-2xl bg-[var(--color-surface-secondary)]" />
      <div className="h-64 animate-pulse rounded-2xl bg-[var(--color-surface-secondary)]" />
      <div className="h-64 animate-pulse rounded-2xl bg-[var(--color-surface-secondary)]" />
    </>
  );
}

export function DashboardDiscoveryGrid({
  campaigns,
  products,
  communities,
  loading = false,
  className,
  variant = "default",
}: DashboardDiscoveryGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        variant === "sidebar"
          ? "grid-cols-1"
          : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        className
      )}
    >
      {loading ? (
        <DiscoverySkeleton />
      ) : (
        <>
          <TopCampaigns campaigns={campaigns} />
          <TrendingProducts products={products} />
          <YourCommunities communities={communities} />
        </>
      )}
    </div>
  );
}
