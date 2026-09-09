"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Boxes,
  CalendarClock,
  Layers,
  Loader2,
  Megaphone,
  MousePointerClick,
  ShoppingBag,
  Sparkles,
  Users2,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { IdentityCard, IdentityEmptyState, cn } from "@/components/identity/identity-ui";
import type {
  AffiliateModuleSnapshot,
  CommunityModuleSnapshot,
  MarketplaceModuleSnapshot,
  UgcModuleSnapshot,
} from "@/lib/identity/module-snapshots";

export type IdentitySurface = "ugc" | "affiliate" | "marketplace" | "community";

type ModuleResponse<T> = { surface: IdentitySurface; isOwner: boolean; data: T; computedAt: string };

function formatMoney(value: number): string {
  return `$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const SURFACE_META: Record<IdentitySurface, { title: string; description: string; exploreHref: string; exploreLabel: string }> = {
  ugc: {
    title: "UGC campaigns",
    description: "Recent campaigns joined and content submissions.",
    exploreHref: "/ugc",
    exploreLabel: "Discover campaigns",
  },
  affiliate: {
    title: "Affiliate performance",
    description: "Clicks, conversions and commission earned promoting Jimvio products.",
    exploreHref: "/affiliate",
    exploreLabel: "Open affiliate hub",
  },
  marketplace: {
    title: "Marketplace store",
    description: "Products listed and sales performance as a vendor.",
    exploreHref: "/marketplace",
    exploreLabel: "Browse marketplace",
  },
  community: {
    title: "Communities",
    description: "Communities joined and standing within each.",
    exploreHref: "/communities",
    exploreLabel: "Explore communities",
  },
};

export function IdentityModulePanel({
  surface,
  username,
}: {
  surface: IdentitySurface;
  /** Omit to fetch the signed-in viewer's own module snapshot. */
  username?: string | null;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [payload, setPayload] = useState<ModuleResponse<unknown> | null>(null);
  const meta = SURFACE_META[surface];

  useEffect(() => {
    let active = true;
    setStatus("loading");
    const qs = username ? `?username=${encodeURIComponent(username)}` : "";
    fetch(`/api/identity/modules/${surface}${qs}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 403 || res.status === 401) return setStatus("forbidden");
        if (!res.ok) return setStatus("error");
        const json = (await res.json()) as ModuleResponse<unknown>;
        setPayload(json);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [surface, username]);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[#FF5A1F]" />
      </div>
    );
  }

  if (status === "forbidden") {
    return <IdentityEmptyState icon={<Layers className="h-6 w-6" />} title="This profile is private" />;
  }

  if (status === "error" || !payload) {
    return (
      <IdentityEmptyState
        icon={<Layers className="h-6 w-6" />}
        title="Couldn't load this section"
        description="Please try again in a moment."
      />
    );
  }

  return (
    <div>
      {surface === "ugc" && <UgcModuleView data={payload.data as UgcModuleSnapshot} meta={meta} />}
      {surface === "affiliate" && <AffiliateModuleView data={payload.data as AffiliateModuleSnapshot} meta={meta} />}
      {surface === "marketplace" && <MarketplaceModuleView data={payload.data as MarketplaceModuleSnapshot} meta={meta} />}
      {surface === "community" && <CommunityModuleView data={payload.data as CommunityModuleSnapshot} meta={meta} />}
    </div>
  );
}

function ModuleHeader({ meta }: { meta: (typeof SURFACE_META)[IdentitySurface] }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Module</p>
        <h2 className="font-[var(--font-identity-serif)] text-[20px] font-medium tracking-tight text-[#161512]">
          {meta.title}
        </h2>
        <p className="mt-1 text-[13px] text-[#8B8579]">{meta.description}</p>
      </div>
      <Link
        href={meta.exploreHref}
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white px-3.5 text-[12px] font-semibold text-[#1C1B19] transition-colors hover:border-black/20 hover:bg-black/[0.02]"
      >
        {meta.exploreLabel}
      </Link>
    </div>
  );
}

function UgcModuleView({ data, meta }: { data: UgcModuleSnapshot; meta: (typeof SURFACE_META)["ugc"] }) {
  return (
    <div>
      <ModuleHeader meta={meta} />
      {!data.isCreator ? (
        <IdentityEmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No UGC activity yet"
          description="This creator hasn't joined any UGC campaigns."
        />
      ) : (
        <div className="space-y-5">
          {data.recentCampaigns.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9A9388]">
                Recent campaigns
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {data.recentCampaigns.map((c) => (
                  <IdentityCard key={c.campaignId} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#1C1B19]">{c.title}</p>
                      {c.joinedAt && (
                        <p className="text-[11px] text-[#9A9388]">
                          Joined {new Date(c.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <StatusPill status={c.status} />
                  </IdentityCard>
                ))}
              </div>
            </div>
          )}

          {data.recentSubmissions.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9A9388]">
                Recent submissions
              </p>
              <div className="space-y-2">
                {data.recentSubmissions.map((s) => (
                  <IdentityCard key={s.submissionId} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-[#1C1B19]">
                        {s.platform.charAt(0).toUpperCase() + s.platform.slice(1)} submission
                      </p>
                      <p className="text-[11px] text-[#9A9388]">{formatNumber(s.totalViews)} views</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold text-[#1C8A44]">{formatMoney(s.totalEarnings)}</span>
                      <StatusPill status={s.status} />
                    </div>
                  </IdentityCard>
                ))}
              </div>
            </div>
          )}

          {data.recentCampaigns.length === 0 && data.recentSubmissions.length === 0 && (
            <IdentityEmptyState icon={<Megaphone className="h-6 w-6" />} title="No recent campaign activity" />
          )}
        </div>
      )}
    </div>
  );
}

function AffiliateModuleView({ data, meta }: { data: AffiliateModuleSnapshot; meta: (typeof SURFACE_META)["affiliate"] }) {
  return (
    <div>
      <ModuleHeader meta={meta} />
      {!data.isAffiliate ? (
        <IdentityEmptyState
          icon={<Users2 className="h-6 w-6" />}
          title="Not an affiliate yet"
          description="This creator hasn't joined the Jimvio affiliate program."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <ModuleMetric icon={MousePointerClick} label="Clicks" value={formatNumber(data.totalClicks)} />
          <ModuleMetric icon={BadgeCheck} label="Conversions" value={formatNumber(data.totalConversions)} />
          <ModuleMetric icon={Sparkles} label="Total earned" value={formatMoney(data.totalEarnings)} accent />
          <ModuleMetric
            label="Tier"
            icon={Users2}
            value={data.tier ? data.tier.charAt(0).toUpperCase() + data.tier.slice(1) : "—"}
          />
        </div>
      )}
    </div>
  );
}

function MarketplaceModuleView({ data, meta }: { data: MarketplaceModuleSnapshot; meta: (typeof SURFACE_META)["marketplace"] }) {
  return (
    <div>
      <ModuleHeader meta={meta} />
      {!data.isVendor ? (
        <IdentityEmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Not a vendor yet"
          description="This creator doesn't have a marketplace store."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <ModuleMetric icon={Boxes} label="Products" value={formatNumber(data.productsCount)} />
          <ModuleMetric icon={ShoppingBag} label="Sales" value={formatNumber(data.totalSales)} />
          <ModuleMetric icon={Sparkles} label="Revenue" value={formatMoney(data.totalRevenue)} accent />
          <ModuleMetric icon={BadgeCheck} label="Store" value={data.businessName ?? "—"} />
        </div>
      )}
    </div>
  );
}

function CommunityModuleView({ data, meta }: { data: CommunityModuleSnapshot; meta: (typeof SURFACE_META)["community"] }) {
  return (
    <div>
      <ModuleHeader meta={meta} />
      {data.communitiesJoined.length === 0 ? (
        <IdentityEmptyState
          icon={<Users2 className="h-6 w-6" />}
          title="Not part of any community yet"
        />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {data.communitiesJoined.map((c) => (
            <Link key={c.communityId} href={c.slug ? `/communities/${c.slug}` : "/communities"}>
              <IdentityCard className="flex items-center gap-3 p-3.5 transition-colors hover:border-[#FF5A1F]/30">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FF5A1F] text-[13px] font-semibold text-white">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    c.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-semibold text-[#1C1B19]">{c.name}</p>
                    {c.role && c.role !== "member" ? (
                      <span className="shrink-0 rounded-full bg-[#FFF1EA] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#D6480F]">
                        {c.role}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[11.5px] text-[#9A9388]">
                    {typeof c.memberCount === "number" && c.memberCount > 0
                      ? `${formatNumber(c.memberCount)} members`
                      : `Level ${c.level}`}
                    {c.totalPoints > 0 ? ` · ${formatNumber(c.totalPoints)} pts` : ""}
                  </p>
                </div>
              </IdentityCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleMetric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border p-4", accent ? "border-[#FFDCC7] bg-[#FFF1EA]" : "border-black/[0.06] bg-white")}>
      <Icon className={cn("mb-2 h-4 w-4", accent ? "text-[#D6480F]" : "text-[#FF5A1F]")} />
      <p className="font-[var(--font-identity-serif)] text-[18px] font-medium leading-tight text-[#161512]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#9A9388]">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "completed" || status === "approved"
      ? "bg-[#EAF7EE] text-[#1C8A44]"
      : status === "rejected" || status === "declined"
        ? "bg-[#FDEDEB] text-[#C23A2F]"
        : "bg-black/[0.04] text-[#59544B]";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize", tone)}>
      <CalendarClock className="h-2.5 w-2.5" />
      {status}
    </span>
  );
}
