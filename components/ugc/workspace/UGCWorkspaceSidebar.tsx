"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bookmark,
  Bot,
  Calendar,
  Clapperboard,
  ChevronDown,
  Compass,
  Copy,
  DollarSign,
  FileSignature,
  FileStack,
  FileVideo,
  FolderOpen,
  Gift,
  Handshake,
  LayoutDashboard,
  LineChart,
  Megaphone,
  PlusCircle,
  Scale,
  Search,
  Shield,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Users,
  Wallet,
  Webhook,
  Workflow,
  Zap,
  ArrowRight,
  ImageIcon,
  Mail,
} from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import type { UgcMessageKey } from "@/lib/ugc/i18n/messages";
import { UgcWorkspaceSwitcher } from "./UgcWorkspaceSwitcher";
import { useUgcBrandWorkspace } from "./UgcBrandWorkspaceProvider";
import { withBrandQuery } from "@/lib/ugc/client/with-brand-query";

const PRIMARY_NAV: {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  i18n?: UgcMessageKey;
}[] = [
  { id: "dashboard", label: "Dashboard", href: "/ugc/dashboard", icon: LayoutDashboard, i18n: "dashboard" },
  { id: "discover", label: "Discover Campaigns", href: "/ugc", icon: Compass, i18n: "discover" },
  { id: "applications", label: "My Applications", href: "/ugc/applications", icon: FileVideo, i18n: "applications" },
  { id: "creator-profile", label: "Creator Profile", href: "/identity/edit", icon: UserRound, i18n: "creatorProfileNav" },
  { id: "projects", label: "Active Projects", href: "/ugc/campaigns", icon: Clapperboard, i18n: "projects" },
  { id: "submissions", label: "Submissions", href: "/ugc/submissions", icon: FileVideo, i18n: "submissions" },
  { id: "library", label: "Library", href: "/ugc/library", icon: FolderOpen, i18n: "library" },
  { id: "saved", label: "Saved", href: "/ugc/saved", icon: Bookmark, i18n: "saved" },
  { id: "calendar", label: "Calendar", href: "/ugc/calendar", icon: Calendar, i18n: "calendar" },
  { id: "matches", label: "Matches", href: "/ugc/matches", icon: Sparkles, i18n: "matches" },
  { id: "creator-copilot", label: "Creator Copilot", href: "/ugc/creator-copilot", icon: Bot, i18n: "creatorCopilot" },
  { id: "achievements", label: "Achievements", href: "/ugc/achievements", icon: Trophy, i18n: "achievements" },
  { id: "analytics", label: "Analytics", href: "/ugc/analytics", icon: BarChart3, i18n: "analytics" },
  { id: "insights", label: "Insights", href: "/ugc/insights", icon: LineChart, i18n: "insights" },
  { id: "earnings", label: "Earnings", href: "/ugc/earnings", icon: DollarSign, i18n: "earnings" },
  { id: "payouts", label: "Payouts", href: "/ugc/payouts", icon: Wallet, i18n: "payouts" },
  { id: "referrals", label: "Referrals", href: "/ugc/referrals", icon: Gift, i18n: "referrals" },
  { id: "deals", label: "Brand Deals", href: "/ugc/brand-deals", icon: Handshake, i18n: "deals" },
];

const CAMPAIGN_CENTER_MORE: {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  i18n?: UgcMessageKey;
}[] = [
  { id: "cc-mine", label: "My Campaigns", href: "/ugc/campaign-center", icon: Megaphone, i18n: "myCampaigns" },
  { id: "cc-drafts", label: "Drafts", href: "/ugc/campaign-center/drafts", icon: FileStack, i18n: "drafts" },
  { id: "cc-active", label: "Active Campaigns", href: "/ugc/campaign-center/active", icon: FolderOpen, i18n: "activeCampaigns" },
  { id: "cc-completed", label: "Completed Campaigns", href: "/ugc/campaign-center/completed", icon: Copy, i18n: "completedCampaigns" },
  { id: "cc-templates", label: "Templates", href: "/ugc/campaign-center/templates", icon: FileStack, i18n: "templates" },
  { id: "cc-favorites", label: "Favorites", href: "/ugc/campaign-center/favorites", icon: Star, i18n: "favorites" },
  { id: "cc-invitations", label: "Invitations", href: "/ugc/campaign-center/invitations", icon: Mail, i18n: "invitations" },
  { id: "cc-search", label: "Search", href: "/ugc/search", icon: Search, i18n: "search" },
  { id: "cc-analytics", label: "Analytics", href: "/ugc/campaign-center/analytics", icon: BarChart3, i18n: "analytics" },
  { id: "cc-recruit", label: "Creator Recruitment", href: "/ugc/campaign-center/recruitment", icon: Users, i18n: "creatorRecruitment" },
  { id: "cc-assets", label: "Campaign Assets", href: "/ugc/campaign-center/assets", icon: ImageIcon, i18n: "campaignAssets" },
  { id: "cc-copilot", label: "Copilot", href: "/ugc/campaign-center/copilot", icon: Bot, i18n: "copilot" },
  { id: "cc-team", label: "Team", href: "/ugc/campaign-center/team", icon: Users, i18n: "team" },
  { id: "cc-crm", label: "CRM", href: "/ugc/campaign-center/crm", icon: Handshake, i18n: "crm" },
  { id: "cc-contracts", label: "Contracts", href: "/ugc/campaign-center/contracts", icon: FileSignature, i18n: "contracts" },
  { id: "cc-escrow", label: "Escrow", href: "/ugc/campaign-center/escrow", icon: Shield, i18n: "escrow" },
  { id: "cc-disputes", label: "Disputes", href: "/ugc/campaign-center/disputes", icon: Scale, i18n: "disputes" },
  { id: "cc-automations", label: "Automations", href: "/ugc/campaign-center/automations", icon: Zap, i18n: "automations" },
  { id: "cc-workflows", label: "Workflows", href: "/ugc/campaign-center/workflows", icon: Workflow, i18n: "workflows" },
  { id: "cc-webhooks", label: "Webhooks", href: "/ugc/campaign-center/webhooks", icon: Webhook, i18n: "webhooks" },
];

const CC_MORE_STORAGE_KEY = "jimvio-ugc-cc-more-expanded";

function resolveActive(pathname: string): string {
  if (pathname.startsWith("/ugc/campaign-center/create")) return "cc-create";
  if (pathname.startsWith("/ugc/campaign-center/copilot")) return "cc-copilot";
  if (pathname.startsWith("/ugc/campaign-center/drafts")) return "cc-drafts";
  if (pathname.startsWith("/ugc/campaign-center/active")) return "cc-active";
  if (pathname.startsWith("/ugc/campaign-center/completed")) return "cc-completed";
  if (pathname.startsWith("/ugc/campaign-center/templates")) return "cc-templates";
  if (pathname.startsWith("/ugc/campaign-center/favorites")) return "cc-favorites";
  if (pathname.startsWith("/ugc/campaign-center/invitations")) return "cc-invitations";
  if (pathname.startsWith("/ugc/campaign-center/analytics")) return "cc-analytics";
  if (pathname.startsWith("/ugc/campaign-center/recruitment")) return "cc-recruit";
  if (pathname.startsWith("/ugc/campaign-center/assets")) return "cc-assets";
  if (pathname.startsWith("/ugc/campaign-center/team")) return "cc-team";
  if (pathname.startsWith("/ugc/campaign-center/crm")) return "cc-crm";
  if (pathname.startsWith("/ugc/campaign-center/contracts")) return "cc-contracts";
  if (pathname.startsWith("/ugc/campaign-center/escrow")) return "cc-escrow";
  if (pathname.startsWith("/ugc/campaign-center/disputes")) return "cc-disputes";
  if (pathname.startsWith("/ugc/campaign-center/automations")) return "cc-automations";
  if (pathname.startsWith("/ugc/campaign-center/workflows")) return "cc-workflows";
  if (pathname.startsWith("/ugc/campaign-center/webhooks")) return "cc-webhooks";
  if (pathname.match(/^\/ugc\/campaign-center\/[^/]+\/live/)) return "cc-mine";
  if (pathname.match(/^\/ugc\/campaign-center\/[^/]+\/fund/)) return "cc-mine";
  if (pathname.startsWith("/ugc/campaign-center")) return "cc-mine";
  if (pathname === "/ugc/dashboard" || pathname === "/ugc/dashboard/") return "dashboard";
  if (/^\/ugc\/[^/]+\/dashboard\/?$/.test(pathname)) return "projects";
  if (pathname.startsWith("/ugc/applications")) return "applications";
  if (pathname.startsWith("/identity")) return "creator-profile";
  if (pathname.startsWith("/ugc/campaigns")) return "projects";
  if (pathname.startsWith("/ugc/submissions")) return "submissions";
  if (pathname.startsWith("/ugc/library")) return "library";
  if (pathname.startsWith("/ugc/saved")) return "saved";
  if (pathname.startsWith("/ugc/calendar")) return "calendar";
  if (pathname.startsWith("/ugc/matches")) return "matches";
  if (pathname.startsWith("/ugc/creator-copilot")) return "creator-copilot";
  if (pathname.startsWith("/ugc/achievements")) return "achievements";
  if (pathname.startsWith("/ugc/search")) return "cc-search";
  if (pathname.startsWith("/ugc/insights")) return "insights";
  if (pathname.startsWith("/ugc/analytics")) return "analytics";
  if (pathname.startsWith("/ugc/earnings")) return "earnings";
  if (pathname.startsWith("/ugc/payouts")) return "payouts";
  if (pathname.startsWith("/ugc/referrals")) return "referrals";
  if (pathname.startsWith("/ugc/brand-deals")) return "deals";
  if (pathname === "/ugc" || pathname === "/ugc/") return "discover";
  if (pathname.startsWith("/ugc/")) return "discover";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "mission";
  return "discover";
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: { id: string; label: string; href: string; icon: typeof LayoutDashboard };
  active: boolean;
  onNavigate?: () => void;
}) {
  const { brandId } = useUgcBrandWorkspace();
  const href =
    item.href.startsWith("/ugc/campaign-center") ? withBrandQuery(item.href, brandId) : item.href;
  const Icon = item.icon;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-[10px] px-2.5 py-[8px] text-[12px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
        active
          ? "bg-[#FFF0E8] font-semibold text-[#FF5A1F]"
          : "text-[#4B5563] hover:bg-[#F8FAFC] hover:text-[#111827]",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-full bg-[#FF5A1F]"
        />
      ) : null}
      <Icon
        strokeWidth={active ? 2.25 : 1.8}
        className={cn(
          "h-[15px] w-[15px] shrink-0 transition-colors",
          active ? "text-[#FF5A1F]" : "text-[#9CA3AF] group-hover:text-[#6B7280]",
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

type UGCWorkspaceSidebarProps = {
  onNavigate?: () => void;
};

export function UGCWorkspaceSidebar({ onNavigate }: UGCWorkspaceSidebarProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const activeId = resolveActive(pathname);
  const openAssistant = useAIStore((s) => s.openAssistant);
  const moreItemActive = CAMPAIGN_CENTER_MORE.some((i) => i.id === activeId);

  const [moreOpen, setMoreOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CC_MORE_STORAGE_KEY);
      if (saved === "1") setMoreOpen(true);
      else if (saved === "0") setMoreOpen(false);
      else if (moreItemActive) setMoreOpen(true);
    } catch {
      if (moreItemActive) setMoreOpen(true);
    }
    setHydrated(true);
  }, [moreItemActive]);

  useEffect(() => {
    if (!hydrated) return;
    if (moreItemActive && !moreOpen) setMoreOpen(true);
  }, [moreItemActive, hydrated, moreOpen]);

  const toggleMore = () => {
    setMoreOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CC_MORE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex h-full w-[220px] flex-col bg-[var(--color-surface)] xl:w-[236px]">
      <div className="px-3.5 pb-2 pt-4">
        <h2 className="text-[12px] font-bold tracking-tight text-[var(--color-text-primary)]">{t("ugcClipping")}</h2>
        <UgcWorkspaceSwitcher />
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "mt-2.5 flex items-center gap-1.5 rounded-[10px] border px-2.5 py-[7px] text-[10px] font-bold transition-all duration-150",
            activeId === "mission"
              ? "border-[#FF5A1F] bg-[#FFF0E8] text-[#FF5A1F] shadow-[0_1px_4px_rgba(255,90,31,0.12)]"
              : "border-[#FFE4D6] bg-[#FFF8F5] text-[#FF5A1F] hover:border-[#FF5A1F]/45 hover:bg-[#FFF0E8]",
          )}
        >
          <LayoutDashboard className="h-3 w-3" strokeWidth={2.25} />
          {t("home")}
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
        <ul className="space-y-[2px]">
          {PRIMARY_NAV.map((item) => (
            <li key={item.id}>
              <NavLink
                item={{ ...item, label: item.i18n ? t(item.i18n) : item.label }}
                active={item.id === activeId}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>

        <div className="mt-4 px-2.5 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
            {t("campaignCenter")}
          </p>
        </div>
        <ul className="space-y-[2px]">
          <li>
            <NavLink
              item={{
                id: "cc-create",
                label: t("createCampaign"),
                href: "/ugc/campaign-center/create",
                icon: PlusCircle,
              }}
              active={activeId === "cc-create"}
              onNavigate={onNavigate}
            />
          </li>
          <li>
            <button
              type="button"
              onClick={toggleMore}
              aria-expanded={moreOpen}
              aria-label={t("more")}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-[8px] text-[12px] font-medium transition-all duration-150",
                moreOpen || moreItemActive
                  ? "text-[#FF5A1F]"
                  : "text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827]",
              )}
            >
              <ChevronDown
                className={cn(
                  "h-[15px] w-[15px] shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  moreOpen ? "rotate-0 text-[#FF5A1F]" : "-rotate-90 text-[#9CA3AF]",
                )}
                strokeWidth={2.2}
              />
              <span className="truncate font-semibold">{t("more")}</span>
            </button>
            <AnimatePresence initial={false}>
              {moreOpen ? (
                <motion.ul
                  key="cc-more"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-[2px] pb-1 pt-0.5">
                    {CAMPAIGN_CENTER_MORE.map((item) => (
                      <li key={item.id}>
                        <NavLink
                          item={{ ...item, label: item.i18n ? t(item.i18n) : item.label }}
                          active={item.id === activeId}
                          onNavigate={onNavigate}
                        />
                      </li>
                    ))}
                  </div>
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </li>
        </ul>

        <div className="mt-3 shrink-0 px-0.5 pb-1 pt-1">
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[20px] border border-white/30 p-3.5 shadow-[0_14px_40px_rgba(255,90,31,0.36),0_2px_10px_rgba(17,24,39,0.1)]"
            style={{
              background: "linear-gradient(165deg, #FF9A68 0%, #FF5A1F 40%, #C93A0C 100%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.32) 0%, transparent 42%), radial-gradient(90% 70% at 100% 0%, rgba(255,255,255,0.24) 0%, transparent 55%)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[1px] rounded-[19px] border border-white/25 backdrop-blur-[1px]"
            />
            <div className="pointer-events-none absolute -bottom-8 left-1/2 h-24 w-32 -translate-x-1/2 rounded-full bg-[#FFB088]/45 blur-2xl" />

            <div className="relative z-[1]">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="grid h-7 w-7 place-items-center rounded-xl border border-white/25 bg-white/20 shadow-inner backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
                </span>
                <span className="text-[13.5px] font-bold tracking-tight text-white">Jimvio AI</span>
              </div>
              <p className="text-[10.5px] leading-[1.4] text-white/93">
                {t("aiBlurb")}
              </p>

              <button
                type="button"
                onClick={() => {
                  openAssistant(
                    "Help me find the best UGC and clipping campaigns to join right now.",
                  );
                  onNavigate?.();
                }}
                className="mt-3.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-white px-3 text-[11.5px] font-bold text-[#FF5A1F] shadow-[0_6px_18px_rgba(17,24,39,0.18)] transition-all duration-150 hover:bg-[#FFFAF7] hover:shadow-[0_8px_22px_rgba(17,24,39,0.22)] dark:bg-white dark:hover:bg-white"
              >
                {t("askAi")}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>

              <div className="mt-2.5 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-x-2 bottom-0 h-3.5 rounded-full bg-[#FF9A60]/9 blur-[8px]" />
                  <Image
                    src="/hero/jimvio-ai-mascot-cutout.png"
                    alt="Jimvio AI"
                    width={96}
                    height={96}
                    className="relative h-auto w-[76px] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.24)]"
                    priority={false}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </nav>
    </div>
  );
}
