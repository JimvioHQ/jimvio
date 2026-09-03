"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Compass,
  DollarSign,
  FileStack,
  FolderKanban,
  Megaphone,
  PlusCircle,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import { UgcWorkspaceSwitcher } from "./UgcWorkspaceSwitcher";
import { useUgcBrandWorkspace } from "./UgcBrandWorkspaceProvider";
import { withBrandQuery } from "@/lib/ugc/client/with-brand-query";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof Compass;
};

const WORK_NAV: NavItem[] = [
  { id: "discover", label: "Discover Campaigns", href: "/ugc", icon: Compass },
  { id: "campaigns", label: "My Campaigns", href: "/ugc/campaigns", icon: FolderKanban },
  { id: "submissions", label: "Submissions", href: "/ugc/submissions", icon: FileStack },
  { id: "earnings", label: "Earnings", href: "/ugc/earnings", icon: DollarSign },
];

const SECONDARY_NAV: NavItem[] = [
  { id: "activity", label: "Activity", href: "/ugc/activity", icon: Bell },
];

function resolveActive(pathname: string): string {
  if (pathname.startsWith("/ugc/campaign-center/create")) return "cc-create";
  if (pathname.startsWith("/ugc/campaign-center")) return "cc-home";
  if (pathname.startsWith("/ugc/submissions")) return "submissions";
  if (pathname.startsWith("/ugc/earnings") || pathname.startsWith("/ugc/payouts")) return "earnings";
  if (pathname.startsWith("/ugc/activity")) return "activity";
  if (
    pathname.startsWith("/ugc/campaigns") ||
    pathname.startsWith("/ugc/applications") ||
    pathname.startsWith("/ugc/calendar") ||
    /^\/ugc\/[^/]+\/(dashboard|application|submit|timeline)/.test(pathname)
  ) {
    return "campaigns";
  }
  if (pathname.startsWith("/identity")) return "profile";
  if (pathname === "/ugc" || pathname === "/ugc/" || pathname.startsWith("/ugc/search")) {
    return "discover";
  }
  if (/^\/ugc\/[^/]+\/?$/.test(pathname) || pathname.startsWith("/ugc/")) return "discover";
  return "discover";
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const { brandId } = useUgcBrandWorkspace();
  const href = item.href.startsWith("/ugc/campaign-center")
    ? withBrandQuery(item.href, brandId)
    : item.href;
  const Icon = item.icon;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-[10px] px-2.5 py-[8px] text-[14px] font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
        active
          ? "bg-[#FFF0E8] font-semibold text-[#FF5A1F]"
          : "text-[#111827] hover:bg-[#F8FAFC] hover:text-[#111827]",
      )}
    >
      <Icon
        strokeWidth={active ? 2.2 : 1.85}
        className={cn(
          "h-[16px] w-[16px] shrink-0",
          active ? "text-[#FF5A1F]" : "text-[#94A3B8] group-hover:text-[#64748B]",
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
  const { workspaces } = useUgcBrandWorkspace();
  const activeId = resolveActive(pathname);
  const showBrandNav = workspaces.length > 0;

  return (
    <div className="flex h-full w-[228px] flex-col border-r border-[#E5E7EB] bg-white xl:w-[244px]">
      <div className="border-b border-[#F1F5F9] px-3.5 pb-3 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
          {t("ugcClipping")}
        </p>
        <UgcWorkspaceSwitcher />
        <Link
          href="/identity/edit"
          onClick={onNavigate}
          className={cn(
            "mt-1 flex items-center gap-2 rounded-[10px] px-2.5 py-[7px] text-[13px] font-medium transition-colors",
            activeId === "profile"
              ? "bg-[#FFF0E8] text-[#FF5A1F]"
              : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#111827]",
          )}
        >
          <UserRound className="h-4 w-4" strokeWidth={1.9} />
          Creator profile
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3">
        <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
          Work
        </p>
        <ul className="space-y-[2px]">
          {WORK_NAV.map((item) => (
            <li key={item.id}>
              <NavLink item={item} active={item.id === activeId} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        <p className="mb-1.5 mt-5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
          Activity
        </p>
        <ul className="space-y-[2px]">
          {SECONDARY_NAV.map((item) => (
            <li key={item.id}>
              <NavLink item={item} active={item.id === activeId} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        {showBrandNav ? (
          <>
            <p className="mb-1.5 mt-5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
              {t("campaignCenter")}
            </p>
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
                <NavLink
                  item={{
                    id: "cc-home",
                    label: t("myCampaigns"),
                    href: "/ugc/campaign-center",
                    icon: Megaphone,
                  }}
                  active={activeId === "cc-home"}
                  onNavigate={onNavigate}
                />
              </li>
            </ul>
          </>
        ) : null}
      </nav>
    </div>
  );
}

export const UGC_MOBILE_TABS = WORK_NAV;
