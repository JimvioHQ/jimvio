"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Box, Globe, Store, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_STATS, formatPlatformStat } from "@/lib/platform-stats";
import { DEFAULT_PROFILE_IMAGE, resolveProfileImage } from "@/lib/profile-image";
import { safeMediaUrl } from "@/lib/media/optimize-url";
import { AnimatedPlatformStatValue } from "@/components/platform/platform-stats-provider";
import type { WorldMapDot, WorldMapPin } from "@/components/ui/world-map";

const WorldMap = dynamic(
  () => import("@/components/ui/world-map").then((m) => m.WorldMap),
  { ssr: false, loading: () => <div className="aspect-[2/1] w-full" aria-hidden /> },
);

const ORANGE = "#FF5A1F";

const MAP_DOTS: WorldMapDot[] = [
  { start: { lat: 40.7, lng: -74 }, end: { lat: 51.5, lng: -0.1 } },
  { start: { lat: 51.5, lng: -0.1 }, end: { lat: 6.5, lng: 3.4 } },
  { start: { lat: 6.5, lng: 3.4 }, end: { lat: 19.1, lng: 72.9 } },
  { start: { lat: 19.1, lng: 72.9 }, end: { lat: 35.7, lng: 139.7 } },
  { start: { lat: 40.7, lng: -74 }, end: { lat: -23.5, lng: -46.6 } },
  { start: { lat: -23.5, lng: -46.6 }, end: { lat: -1.3, lng: 36.8 } },
  { start: { lat: 48.9, lng: 2.3 }, end: { lat: 25.2, lng: 55.3 } },
  { start: { lat: 1.3, lng: 103.8 }, end: { lat: -33.9, lng: 151.2 } },
];

const MAP_PINS: WorldMapPin[] = [
  { lat: 40.7, lng: -74, color: ORANGE },
  { lat: 51.5, lng: -0.1, color: ORANGE },
  { lat: 48.9, lng: 2.3, color: ORANGE },
  { lat: -23.5, lng: -46.6, color: ORANGE },
  { lat: 6.5, lng: 3.4, color: ORANGE },
  { lat: -1.3, lng: 36.8, color: ORANGE },
  { lat: 19.1, lng: 72.9, color: ORANGE },
  { lat: 25.2, lng: 55.3, color: ORANGE },
  { lat: 1.3, lng: 103.8, color: ORANGE },
  { lat: 35.7, lng: 139.7, color: ORANGE },
  { lat: -33.9, lng: 151.2, color: ORANGE },
];

const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

type TopCreatorRow = {
  id: string;
  display_name?: string;
  full_name?: string;
  profile_image?: string | null;
  avatar_url?: string | null;
  role?: string;
  earnings?: number;
  total_earnings?: number;
  total_followers?: number;
};

const METRICS = [
  {
    key: "countries" as const,
    label: "Countries",
    icon: Globe,
    color: ORANGE,
  },
  {
    key: "users" as const,
    label: "Users",
    icon: Users,
    color: "#16a34a",
  },
  {
    key: "businesses" as const,
    label: "Businesses",
    icon: Store,
    color: "#7c3aed",
  },
  {
    key: "products" as const,
    label: "Products",
    icon: Box,
    color: "#2563eb",
  },
];

const ROW_TINTS = ["#FFF6F2", "#F3FBF6", "#F4FBF7"];

export function GlobalNetworkSection({
  creators = [],
}: {
  creators?: TopCreatorRow[];
  platform?: {
    totalUsers: number;
    totalProducts: number;
    totalEarnings: number;
    totalVendors: number;
  };
}) {
  const list = creators
    .map((c) => ({
      id: c.id,
      name: c.display_name ?? c.full_name ?? "Creator",
      image: resolveProfileImage(c.profile_image ?? c.avatar_url),
      role: c.role ?? "Creator",
      earnings: Number(c.earnings ?? c.total_earnings ?? 0),
    }))
    .filter((c) => c.name.trim().length > 0)
    .slice(0, 3);

  const hasEarnings = list.some((c) => c.earnings > 0);

  return (
    <section
      className="jimvio-global-network relative overflow-x-clip py-12 sm:py-14 lg:py-16"
      aria-labelledby="jimvio-global-network-title"
    >
      <div className={shell}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-6">
          {/* Global Network */}
          <div className="rounded-[24px] border border-[rgba(17,24,39,0.07)] bg-white p-5 shadow-[0_10px_28px_rgba(17,24,39,0.05)] sm:p-6 lg:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="jimvio-global-network-title"
                  className="text-[20px] font-black tracking-[-0.03em] text-[#111827] sm:text-[22px]"
                >
                  Global Network
                </h2>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  {PLATFORM_STATS.countries} Countries Connected
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,90,31,0.2)] bg-[#FFF4EF] px-2.5 py-1 text-[11px] font-bold text-[#FF5A1F]">
                <span className="size-1.5 rounded-full bg-[#ef4444]" aria-hidden />
                Live Network
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="grid w-full shrink-0 grid-cols-2 gap-2.5 sm:w-[200px] sm:grid-cols-1 sm:gap-3">
                {METRICS.map((m) => (
                  <div
                    key={m.key}
                    className="flex items-center gap-3 rounded-[16px] bg-[#F8FAFC] px-3 py-2.5"
                  >
                    <span
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${m.color}1A`, color: m.color }}
                    >
                      <m.icon className="size-4" strokeWidth={2.2} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[16px] font-black leading-none tabular-nums text-[#111827] sm:text-[17px]">
                        <AnimatedPlatformStatValue statKey={m.key} />
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-[#9CA3AF]">
                        {m.label}
                      </div>
                      <div className="sr-only">
                        {formatPlatformStat(m.key, PLATFORM_STATS[m.key])} {m.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="min-w-0 flex-1">
                <WorldMap
                  dots={MAP_DOTS}
                  pins={MAP_PINS}
                  lineColor={ORANGE}
                  showArcs
                  className="!rounded-none !bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Top Earner */}
          <div className="rounded-[24px] border border-[rgba(17,24,39,0.07)] bg-white p-5 shadow-[0_10px_28px_rgba(17,24,39,0.05)] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-[20px] font-black tracking-[-0.03em] text-[#111827] sm:text-[22px]">
                Top Earner
              </h2>
              <Link
                href="/influencers"
                className="inline-flex items-center gap-1 text-[13px] font-bold text-[#FF5A1F] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
              >
                View All
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>

            {list.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[18px] border border-dashed border-[rgba(17,24,39,0.1)] bg-[#FAFAFA] px-4 text-center">
                <TrendingUp className="mb-2 size-6 text-[#FF5A1F]" aria-hidden />
                <p className="text-[14px] font-bold text-[#111827]">Top creators</p>
                <p className="mt-1 max-w-xs text-[12.5px] text-[#6B7280]">
                  Creator performance updates as the community grows on Jimvio.
                </p>
                <Link
                  href="/ugc"
                  className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-[#FF5A1F]"
                >
                  Explore creator tools
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {list.map((c, i) => (
                  <li
                    key={c.id}
                    className={cn(
                      "flex items-center gap-3 rounded-[16px] px-3 py-3",
                      "border border-[rgba(17,24,39,0.04)]",
                    )}
                    style={{ background: ROW_TINTS[i] ?? "#F8FAFC" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safeMediaUrl(c.image, 96)}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 shrink-0 rounded-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold text-[#111827]">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-[#6B7280]">{c.role}</div>
                    </div>
                    {hasEarnings && c.earnings > 0 ? (
                      <div className="shrink-0 text-[16px] font-black tabular-nums text-[#FF5A1F] sm:text-[18px]">
                        ${Math.round(c.earnings).toLocaleString("en-US")}
                      </div>
                    ) : (
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-[#16a34a]">
                        Active
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
