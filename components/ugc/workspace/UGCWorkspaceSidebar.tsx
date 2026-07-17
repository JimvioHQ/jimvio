"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Clapperboard,
  Compass,
  DollarSign,
  FileVideo,
  Handshake,
  LayoutDashboard,
  LayoutTemplate,
  Scissors,
  Settings,
  User,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "dashboard", label: "Dashboard", href: "/ugc/dashboard", icon: LayoutDashboard },
  { id: "discover", label: "Discover Campaigns", href: "/ugc", icon: Compass },
  { id: "applications", label: "My Applications", href: "/ugc/applications", icon: FileVideo },
  { id: "projects", label: "Active Projects", href: "/ugc/campaigns", icon: Clapperboard },
  { id: "submissions", label: "Submissions", href: "/ugc/submissions", icon: FileVideo },
  { id: "clipping", label: "Clipping Hub", href: "/ugc/clipping", icon: Scissors },
  { id: "templates", label: "Templates", href: "/ugc/templates", icon: LayoutTemplate },
  { id: "analytics", label: "Analytics", href: "/ugc/analytics", icon: BarChart3 },
  { id: "earnings", label: "Earnings", href: "/ugc/earnings", icon: DollarSign },
  { id: "payouts", label: "Payouts", href: "/ugc/payouts", icon: Wallet },
  { id: "deals", label: "Brand Deals", href: "/ugc/brand-deals", icon: Handshake },
  { id: "profile", label: "My Profile", href: "/communities/profile", icon: User },
  { id: "settings", label: "Settings", href: "/communities/settings", icon: Settings },
];

function resolveActive(pathname: string): string {
  if (pathname === "/ugc/dashboard" || pathname === "/ugc/dashboard/") return "dashboard";
  if (/^\/ugc\/[^/]+\/dashboard\/?$/.test(pathname)) return "projects";
  if (pathname.startsWith("/ugc/applications")) return "applications";
  if (pathname.startsWith("/ugc/campaigns")) return "projects";
  if (pathname.startsWith("/ugc/submissions")) return "submissions";
  if (pathname.startsWith("/ugc/clipping")) return "clipping";
  if (pathname.startsWith("/ugc/templates")) return "templates";
  if (pathname.startsWith("/ugc/analytics")) return "analytics";
  if (pathname.startsWith("/ugc/earnings")) return "earnings";
  if (pathname.startsWith("/ugc/payouts")) return "payouts";
  if (pathname.startsWith("/ugc/brand-deals")) return "deals";
  if (pathname.startsWith("/communities/profile")) return "profile";
  if (pathname.startsWith("/communities/settings")) return "settings";
  if (pathname === "/ugc" || pathname === "/ugc/") return "discover";
  if (pathname.startsWith("/ugc/")) return "discover";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "mission";
  return "discover";
}

type UGCWorkspaceSidebarProps = {
  onNavigate?: () => void;
};

export function UGCWorkspaceSidebar({ onNavigate }: UGCWorkspaceSidebarProps) {
  const pathname = usePathname();
  const activeId = resolveActive(pathname);

  return (
    <div className="flex h-full w-[200px] flex-col bg-white xl:w-[216px]">
      <div className="px-4 pb-1.5 pt-3">
        <h2 className="text-[12px] font-bold text-[#111827]">UGC &amp; Clipping</h2>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "mt-1.5 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors",
            activeId === "mission"
              ? "border-[#FF5A1F] bg-[#FFF0E8] text-[#FF5A1F]"
              : "border-[#FFE4D6] bg-[#FFF8F5] text-[#FF5A1F] hover:bg-[#FFF0E8]",
          )}
        >
          <LayoutDashboard className="h-3 w-3" />
          Mission Control
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        <ul className="space-y-px">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeId;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                    active
                      ? "bg-[#FFF0E8] text-[#FF5A1F]"
                      : "text-[#4B5563] hover:bg-[#F5F6F8] hover:text-[#111827]",
                  )}
                >
                  <Icon
                    className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[#FF5A1F]" : "text-[#9CA3AF]")}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-[#F0F0F0] p-2.5">
        <div className="overflow-hidden rounded-[14px] border border-[#E8EAED] bg-white p-2.5 shadow-sm">
          <p className="text-[10px] font-bold leading-snug text-[#111827]">Become a Top Creator</p>
          <p className="mt-0.5 text-[9px] leading-snug text-[#6B7280]">
            Unlock priority applications and higher payouts.
          </p>
          <Link
            href="/communities/profile"
            onClick={onNavigate}
            className="mt-1.5 flex h-6 w-full items-center justify-center rounded-full border border-[#FF5A1F] text-[10px] font-bold text-[#FF5A1F] transition-colors hover:bg-[#FF5A1F] hover:text-white"
          >
            Upgrade Now
          </Link>
        </div>

        <div className="flex justify-center">
          <Image
            src="/hero/jimvio-ai-mascot-cutout.png"
            alt="Jimvio AI"
            width={64}
            height={64}
            className="h-auto w-14 object-contain"
          />
        </div>
      </div>
    </div>
  );
}
