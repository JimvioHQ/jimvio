"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Loader2,
  Megaphone,
  ShoppingBag,
  Users2,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { IdentityCard, cn } from "@/components/identity/identity-ui";
import type {
  AffiliateModuleSnapshot,
  CommunityModuleSnapshot,
  MarketplaceModuleSnapshot,
  UgcModuleSnapshot,
} from "@/lib/identity/module-snapshots";

export type IdentitySurface = "ugc" | "affiliate" | "marketplace" | "community";

type ModuleResponse<T> = {
  surface: IdentitySurface;
  isOwner: boolean;
  data: T;
  computedAt: string;
};

const SURFACE_META: Record<
  IdentitySurface,
  { title: string; description: string; exploreHref: string; exploreLabel: string }
> = {
  ugc: {
    title: "UGC campaigns",
    description: "Campaigns created and managed by this account.",
    exploreHref: "/ugc",
    exploreLabel: "Discover campaigns",
  },
  affiliate: {
    title: "Affiliate",
    description: "Jimvio affiliate program membership.",
    exploreHref: "/affiliate",
    exploreLabel: "Open affiliate hub",
  },
  marketplace: {
    title: "Marketplace store",
    description: "Storefront owned by this account.",
    exploreHref: "/marketplace/physical",
    exploreLabel: "Browse marketplace",
  },
  community: {
    title: "Communities you manage",
    description: "Communities owned or administered by this account.",
    exploreHref: "/communities",
    exploreLabel: "Explore communities",
  },
};

function hasPublicContent(surface: IdentitySurface, data: unknown): boolean {
  if (surface === "ugc") {
    const d = data as UgcModuleSnapshot;
    return (d.ownedCampaigns?.length ?? 0) > 0;
  }
  if (surface === "affiliate") {
    return Boolean((data as AffiliateModuleSnapshot).isAffiliate);
  }
  if (surface === "marketplace") {
    return Boolean((data as MarketplaceModuleSnapshot).isVendor);
  }
  const d = data as CommunityModuleSnapshot;
  if ((d.communitiesManaged?.length ?? 0) > 0) return true;
  return (d.communitiesJoined ?? []).some((c) => c.role === "owner" || c.role === "admin");
}

export function IdentityModulePanel({
  surface,
  username,
  onEmpty,
}: {
  surface: IdentitySurface;
  /** Omit to fetch the signed-in viewer's own module snapshot. */
  username?: string | null;
  /** Called when the module has no public content (so parents can hide wrappers). */
  onEmpty?: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">("loading");
  const [payload, setPayload] = useState<ModuleResponse<unknown> | null>(null);
  const meta = SURFACE_META[surface];

  useEffect(() => {
    let active = true;
    setStatus("loading");
    const qs = username ? `?username=${encodeURIComponent(username)}` : "";
    fetch(`/api/identity/modules/${surface}${qs}`)
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setStatus("empty");
          onEmpty?.();
          return;
        }
        const json = (await res.json()) as ModuleResponse<unknown>;
        if (!hasPublicContent(surface, json.data)) {
          setStatus("empty");
          onEmpty?.();
          return;
        }
        setPayload(json);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setStatus("empty");
        onEmpty?.();
      });
    return () => {
      active = false;
    };
  }, [surface, username, onEmpty]);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#FF5A1F]" />
      </div>
    );
  }

  if (status === "empty" || status === "error" || !payload) {
    return null;
  }

  return (
    <div>
      {surface === "ugc" && <UgcModuleView data={payload.data as UgcModuleSnapshot} meta={meta} />}
      {surface === "affiliate" && (
        <AffiliateModuleView data={payload.data as AffiliateModuleSnapshot} meta={meta} />
      )}
      {surface === "marketplace" && (
        <MarketplaceModuleView data={payload.data as MarketplaceModuleSnapshot} meta={meta} />
      )}
      {surface === "community" && (
        <CommunityModuleView data={payload.data as CommunityModuleSnapshot} meta={meta} />
      )}
    </div>
  );
}

function ModuleHeader({ meta }: { meta: (typeof SURFACE_META)[IdentitySurface] }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
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
  const campaigns = data.ownedCampaigns ?? [];
  if (campaigns.length === 0) return null;

  return (
    <div>
      <ModuleHeader meta={meta} />
      <div className="grid gap-3 sm:grid-cols-2">
        {campaigns.map((c) => (
          <Link key={c.campaignId} href={`/ugc/campaigns/${c.campaignId}`} className="group block">
            <IdentityCard className="overflow-hidden transition-colors hover:border-[#FF5A1F]/35">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#FFF1EA]">
                {c.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.coverImage}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-[#FF5A1F]">
                    <Megaphone className="h-7 w-7" />
                  </div>
                )}
                <div className="absolute right-2 top-2">
                  <StatusPill status={c.status} />
                </div>
              </div>
              <div className="space-y-2 p-3.5">
                <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-[#1C1B19]">
                  {c.title}
                </p>
                {c.description ? (
                  <p className="line-clamp-2 text-[12px] leading-relaxed text-[#8B8579]">{c.description}</p>
                ) : null}
                <span className="inline-flex text-[12px] font-semibold text-[#FF5A1F] group-hover:underline">
                  View campaign
                </span>
              </div>
            </IdentityCard>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AffiliateModuleView({
  data,
  meta,
}: {
  data: AffiliateModuleSnapshot;
  meta: (typeof SURFACE_META)["affiliate"];
}) {
  if (!data.isAffiliate) return null;

  return (
    <div>
      <ModuleHeader meta={meta} />
      <IdentityCard className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF1EA] text-[#D6480F]">
          <Users2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-[#1C1B19]">Jimvio Affiliate</p>
          <p className="text-[12px] text-[#8B8579]">
            {data.tier
              ? `${data.tier.charAt(0).toUpperCase()}${data.tier.slice(1)} tier member`
              : "Active affiliate member"}
          </p>
        </div>
        <BadgeCheck className="h-5 w-5 shrink-0 text-[#1C8A44]" />
      </IdentityCard>
    </div>
  );
}

function MarketplaceModuleView({
  data,
  meta,
}: {
  data: MarketplaceModuleSnapshot;
  meta: (typeof SURFACE_META)["marketplace"];
}) {
  if (!data.isVendor) return null;
  const storeHref = data.businessSlug
    ? `/marketplace/vendors/${data.businessSlug}`
    : meta.exploreHref;

  return (
    <div>
      <ModuleHeader meta={meta} />
      <IdentityCard className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF1EA] text-[#D6480F]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#1C1B19]">
              {data.businessName ?? "Storefront"}
            </p>
            <p className="text-[12px] text-[#8B8579]">Owned marketplace store</p>
          </div>
        </div>
        <Link
          href={storeHref}
          className="inline-flex h-9 items-center justify-center rounded-full bg-[#FF5A1F] px-4 text-[12.5px] font-semibold text-white hover:bg-[#e84e18]"
        >
          Visit store
        </Link>
      </IdentityCard>
    </div>
  );
}

function CommunityModuleView({
  data,
  meta,
}: {
  data: CommunityModuleSnapshot;
  meta: (typeof SURFACE_META)["community"];
}) {
  const communities = data.communitiesManaged?.length
    ? data.communitiesManaged
    : (data.communitiesJoined ?? []).filter((c) => c.role === "owner" || c.role === "admin");

  if (communities.length === 0) return null;

  return (
    <div>
      <ModuleHeader meta={meta} />
      <div className="grid gap-3 sm:grid-cols-2">
        {communities.map((c) => (
          <Link
            key={c.communityId}
            href={c.slug ? `/communities/${c.slug}` : "/communities"}
            className="group block"
          >
            <IdentityCard className="flex items-start gap-3 p-3.5 transition-colors hover:border-[#FF5A1F]/35">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FF5A1F] text-[13px] font-semibold text-white ring-1 ring-black/5">
                {c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  c.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-[13.5px] font-semibold text-[#1C1B19] group-hover:text-[#FF5A1F]">
                    {c.name}
                  </p>
                  <span className="shrink-0 rounded-full bg-[#FFF1EA] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#D6480F]">
                    {c.role}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#8B8579]">
                  {"description" in c && c.description
                    ? c.description
                    : typeof c.memberCount === "number" && c.memberCount > 0
                      ? `${formatNumber(c.memberCount)} ${c.memberCount === 1 ? "member" : "members"}`
                      : "Community"}
                </p>
                {typeof c.memberCount === "number" && c.memberCount > 0 && "description" in c && c.description ? (
                  <p className="mt-1.5 text-[11.5px] text-[#9A9388]">
                    {formatNumber(c.memberCount)} {c.memberCount === 1 ? "member" : "members"}
                  </p>
                ) : null}
              </div>
            </IdentityCard>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "completed" || status === "approved" || status === "active" || status === "live"
      ? "bg-[#EAF7EE] text-[#1C8A44]"
      : status === "rejected" || status === "declined"
        ? "bg-[#FDEDEB] text-[#C23A2F]"
        : "bg-black/[0.04] text-[#59544B]";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize",
        tone,
      )}
    >
      {status}
    </span>
  );
}
