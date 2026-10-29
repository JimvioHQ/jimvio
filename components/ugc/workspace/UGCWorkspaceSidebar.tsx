"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  FileCheck2,
  FolderKanban,
  LayoutDashboard,
  PlusCircle,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUgcBrandWorkspace } from "./UgcBrandWorkspaceProvider";
import { UgcWorkspaceSwitcher } from "./UgcWorkspaceSwitcher";
import { withBrandQuery } from "@/lib/ugc/client/with-brand-query";

type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Canonical creator Work nav — Discover / My Campaigns / Submissions only. */
const CREATOR_WORK: NavItem[] = [
  { id: "discover", href: "/ugc", label: "Discover Campaigns", icon: Compass },
  { id: "campaigns", href: "/ugc/campaigns", label: "My Campaigns", icon: FolderKanban },
  { id: "submissions", href: "/ugc/submissions", label: "Submissions", icon: FileCheck2 },
];

const BRAND_WORK: NavItem[] = [
  { id: "overview", href: "/ugc/campaign-center", label: "Overview", icon: LayoutDashboard },
  { id: "discover", href: "/ugc", label: "Discover Campaigns", icon: Compass },
  { id: "campaigns", href: "/ugc/campaign-center/campaigns", label: "My Campaigns", icon: FolderKanban },
  { id: "submissions", href: "/ugc/submissions", label: "Submissions", icon: FileCheck2 },
];

const MANAGE: NavItem[] = [
  { id: "create", href: "/ugc/campaign-center/create", label: "Create Campaign", icon: PlusCircle },
  { id: "checker", href: "/ugc/checker", label: "View Checker", icon: ScanSearch },
];

export const UGC_MOBILE_TABS: NavItem[] = CREATOR_WORK.filter((item) =>
  ["discover", "campaigns", "submissions"].includes(item.id),
);

export const UGC_BRAND_MOBILE_TABS: NavItem[] = [
  BRAND_WORK[0],
  BRAND_WORK[1],
  BRAND_WORK[2],
  BRAND_WORK[3],
];

function isActive(pathname: string, item: NavItem, brandMode: boolean) {
  if (item.id === "discover") return pathname === "/ugc" || pathname === "/ugc/";
  if (item.id === "overview") {
    return pathname === "/ugc/campaign-center" || pathname === "/ugc/campaign-center/";
  }
  if (item.id === "create") return pathname.startsWith("/ugc/campaign-center/create");
  if (item.id === "campaigns" && brandMode) {
    return (
      pathname.startsWith("/ugc/campaign-center/campaigns") ||
      pathname.startsWith("/ugc/campaign-center/active") ||
      pathname.startsWith("/ugc/campaign-center/drafts") ||
      pathname.startsWith("/ugc/campaign-center/completed")
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({
  item,
  active,
  href,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  href: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F]",
        active
          ? "bg-[#FFF4EF] font-semibold text-[#FF5A1F]"
          : "font-medium text-[#4B5563] hover:bg-[#F8FAFC] hover:text-[#111827]",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.1 : 1.75} aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function UGCWorkspaceSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { workspaces, brandId } = useUgcBrandWorkspace();
  const brandMode = workspaces.length > 0;
  const work = brandMode ? BRAND_WORK : CREATOR_WORK;

  return (
    <div className="flex h-full w-[228px] flex-col border-r border-[#E5E7EB] bg-white">
      <div className="px-3 pb-3 pt-4">
        <p className="px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
          UGC & Clipping
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4" aria-label="UGC and Clipping">
        {[...work, ...MANAGE].map((item) => (
          <NavLink
            key={item.id}
            item={item}
            active={isActive(pathname, item, brandMode)}
            href={brandMode ? withBrandQuery(item.href, brandId) : item.href}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      {brandMode ? <UgcWorkspaceSwitcher /> : null}
    </div>
  );
}
