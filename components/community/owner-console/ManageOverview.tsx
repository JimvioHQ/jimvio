"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Camera,
  ChevronRight,
  Crown,
  ExternalLink,
  Layers,
  Pencil,
  Radio,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { hasCapability } from "@/lib/community/workspace/permissions";
import type { OwnerGroupListItem } from "@/lib/community/owner-console/groups";
import { cn } from "@/lib/utils";
import { useOwnerConsole } from "./OwnerConsoleContext";
import { SettingsManagement } from "./settings";
import { useOwnerSettings } from "./settings/useOwnerSettings";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
};

function createdLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Created ${d.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
}

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

type Stat = {
  id: string;
  label: string;
  value: number;
  note: string;
  href: string;
  icon: LucideIcon;
  tile: string;
};

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  return (
    <Link
      href={stat.href}
      className="group flex items-center gap-3 rounded-2xl border border-[#EEF0F3] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#FF5A1F]/30 sm:p-4"
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14", stat.tile)}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium text-[#6B7280] sm:text-[13px]">{stat.label}</span>
        <span className="block text-[22px] font-bold leading-tight tabular-nums text-[#111827] sm:text-[26px]">
          {stat.value.toLocaleString("en-US")}
        </span>
        <span className="block truncate text-[11px] text-[#9CA3AF] sm:text-[12px]">{stat.note}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF] transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

/**
 * Manage Community overview (design spec): community header, key numbers,
 * settings (laptop) or access + spaces (phone). Numbers are live values only.
 */
export function ManageOverview({
  spaces,
  spacesLoading,
}: {
  spaces: OwnerGroupListItem[];
  spacesLoading: boolean;
}) {
  const { community, role, badges, hrefSection, workspaceHref } = useOwnerConsole();
  const { settings } = useOwnerSettings(community?.id ?? null);
  if (!community) return null;

  const canSettings = hasCapability(role, "settings.view") || hasCapability(role, "settings.manage");
  const description = settings?.tagline?.trim() || settings?.description?.trim() || "";
  const created = createdLabel(settings?.createdAt);
  const cover = settings?.coverImage || settings?.bannerUrl || null;
  const isFree = settings ? settings.isFree : true;

  const share = async () => {
    const url = `${window.location.origin}/communities/${community.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: community.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      /* cancelled */
    }
  };

  const stats: Stat[] = [
    {
      id: "members",
      label: "Members",
      value: community.memberCount,
      note: badges.joins > 0 ? `${badges.joins} waiting to join` : "Total members",
      href: hrefSection("members"),
      icon: Users,
      tile: "bg-[#FFF1EA] text-[#FF5A1F]",
    },
    {
      id: "spaces",
      label: "Spaces",
      value: spaces.length,
      note: spaces.length === 1 ? "Discussion area" : "Discussion areas",
      href: hrefSection("spaces"),
      icon: Layers,
      tile: "bg-[#EEF4FF] text-[#2563EB]",
    },
    {
      id: "live",
      label: "Live Sessions",
      value: badges.live,
      note: badges.live > 0 ? "Live now" : "None live right now",
      href: hrefSection("live"),
      icon: Radio,
      tile: "bg-[#F4EEFF] text-[#7C3AED]",
    },
    {
      id: "reports",
      label: "Open Reports",
      value: badges.reports,
      note: badges.reports > 0 ? "Need review" : "All clear",
      href: hrefSection("moderation"),
      icon: BarChart3,
      tile: "bg-[#ECFDF3] text-[#16A34A]",
    },
  ];

  const editGeneral = hrefSection("settings", { tab: "general" });
  const editLook = hrefSection("settings", { tab: "customization" });

  return (
    <div className="space-y-4 pb-4 animate-in fade-in duration-300 sm:space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-[#EEF0F3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] lg:block" aria-hidden>
          {cover ? (
            <Image src={cover} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_80%_30%,#FF7A3D_0,#FFB38A_35%,#FFE7DA_65%,transparent_80%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
        </div>
        <div className="relative flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-[#EEF0F3] sm:h-24 sm:w-24">
              {community.avatarUrl ? (
                <Image src={community.avatarUrl} alt="" fill className="object-contain p-1.5" unoptimized />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#FF5A1F]">
                  {community.name[0]}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[22px] font-bold tracking-tight text-[#111827] sm:text-[30px]">
                  {community.name}
                </h1>
                {canSettings ? (
                  <Link
                    href={editGeneral}
                    aria-label="Edit community name"
                    className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8FAFC] sm:inline-flex"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
                <span className="rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-[12px] font-semibold text-[#16A34A]">
                  {ROLE_LABEL[role] ?? role}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[#6B7280] sm:text-[15px]">
                {plural(community.memberCount, "member", "members")}
                <span className="mx-1.5 text-[#D1D5DB]">•</span>
                {plural(spaces.length, "space", "spaces")}
                {created ? (
                  <>
                    <span className="mx-1.5 hidden text-[#D1D5DB] sm:inline">•</span>
                    <span className="block sm:inline">{created}</span>
                  </>
                ) : null}
              </p>
            </div>
            {canSettings ? (
              <Link
                href={editGeneral}
                aria-label="Edit community"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#374151] shadow ring-1 ring-[#EEF0F3] sm:hidden"
              >
                <Pencil className="h-4 w-4" />
              </Link>
            ) : null}
          </div>

          {description ? (
            <p className="max-w-2xl text-[14px] leading-relaxed text-[#374151] lg:inline-flex lg:items-center lg:gap-2 lg:rounded-xl lg:border lg:border-[#EEF0F3] lg:bg-white/80 lg:px-3 lg:py-2 lg:text-[13px]">
              {description}
              {canSettings ? (
                <Link href={editGeneral} aria-label="Edit description" className="hidden text-[#9CA3AF] hover:text-[#374151] lg:inline">
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </p>
          ) : canSettings ? (
            <Link href={editGeneral} className="text-[13px] font-semibold text-[#FF5A1F] hover:underline">
              Add a short description
            </Link>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:hidden">
            {workspaceHref ? (
              <Link
                href={workspaceHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#111827]"
              >
                <ExternalLink className="h-4 w-4" /> View Community
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#111827]"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
        {canSettings ? (
          <Link
            href={editLook}
            className="absolute right-4 top-4 hidden items-center gap-2 rounded-xl bg-black/45 px-3 py-2 text-[12px] font-semibold text-white backdrop-blur hover:bg-black/60 lg:inline-flex"
          >
            <Camera className="h-4 w-4" /> Change Cover
          </Link>
        ) : null}
      </section>

      {/* Community access (phone) */}
      {canSettings ? (
        <Link
          href={hrefSection("settings", { tab: "access" })}
          className="block rounded-2xl border border-[#EEF0F3] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:hidden"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF1EA] text-[#FF5A1F]">
              <Crown className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-[#111827]">Community Access</p>
              <p className="text-[12px] text-[#6B7280]">Control who can join this community.</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#9CA3AF]" aria-hidden />
          </div>
          <div className="mt-3 grid grid-cols-2 rounded-full bg-[#F3F4F6] p-1 text-center text-[14px] font-semibold">
            <span className={cn("rounded-full py-2", isFree ? "bg-[#FF5A1F] text-white shadow" : "text-[#6B7280]")}>Free</span>
            <span className={cn("rounded-full py-2", !isFree ? "bg-[#FF5A1F] text-white shadow" : "text-[#6B7280]")}>Paid</span>
          </div>
          <p className="mt-2 text-center text-[12px] text-[#6B7280]">
            {isFree ? "Anyone can join this community for free." : "Members pay to join this community."}
          </p>
        </Link>
      ) : null}

      {/* Key numbers */}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((st) => (
          <StatCard key={st.id} stat={st} />
        ))}
      </section>

      {/* Spaces (phone) */}
      {hasCapability(role, "group.manage") ? (
        <section className="rounded-2xl border border-[#EEF0F3] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:hidden">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2563EB]">
              <Layers className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-[#111827]">Spaces</p>
              <p className="text-[12px] text-[#6B7280]">Rooms and discussion areas</p>
            </div>
            <Link href={hrefSection("spaces")} className="text-[13px] font-semibold text-[#FF5A1F]">
              View all
            </Link>
          </div>
          {spacesLoading ? (
            <p className="mt-3 text-[13px] text-[#9CA3AF]">Loading spaces…</p>
          ) : spaces.length === 0 ? (
            <Link href={hrefSection("spaces", { action: "create" })} className="mt-3 block text-[13px] font-semibold text-[#FF5A1F]">
              Create your first space
            </Link>
          ) : (
            <ul className="mt-3 space-y-2">
              {spaces.map((sp) => (
                <li key={sp.id}>
                  <Link
                    href={hrefSection(`spaces/${sp.id}`)}
                    className="flex items-center gap-3 rounded-xl border border-[#EEF0F3] p-3 hover:bg-[#FAFAFB]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                      <Users className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-[#111827]">{sp.name}</span>
                      <span className="block text-[12px] text-[#6B7280]">
                        {sp.memberCount != null ? plural(sp.memberCount, "member", "members") : "Space"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Settings (laptop) */}
      {canSettings ? (
        <div className="hidden lg:block">
          <SettingsManagement />
        </div>
      ) : null}
    </div>
  );
}
