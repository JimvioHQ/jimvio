"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clapperboard,
  Compass,
  Copy,
  DollarSign,
  FileStack,
  FileVideo,
  FolderOpen,
  Handshake,
  LayoutDashboard,
  Megaphone,
  PlusCircle,
  Sparkles,
  Users,
  Wallet,
  ArrowRight,
  ImageIcon,
} from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";
import { cn } from "@/lib/utils";

const PRIMARY_NAV: {
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
  { id: "analytics", label: "Analytics", href: "/ugc/analytics", icon: BarChart3 },
  { id: "earnings", label: "Earnings", href: "/ugc/earnings", icon: DollarSign },
  { id: "payouts", label: "Payouts", href: "/ugc/payouts", icon: Wallet },
  { id: "deals", label: "Brand Deals", href: "/ugc/brand-deals", icon: Handshake },
];

const CAMPAIGN_CENTER_NAV: {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "cc-create", label: "Create Campaign", href: "/ugc/campaign-center/create", icon: PlusCircle },
  { id: "cc-mine", label: "My Campaigns", href: "/ugc/campaign-center", icon: Megaphone },
  { id: "cc-drafts", label: "Drafts", href: "/ugc/campaign-center/drafts", icon: FileStack },
  { id: "cc-active", label: "Active Campaigns", href: "/ugc/campaign-center/active", icon: FolderOpen },
  { id: "cc-completed", label: "Completed Campaigns", href: "/ugc/campaign-center/completed", icon: Copy },
  { id: "cc-analytics", label: "Analytics", href: "/ugc/campaign-center/analytics", icon: BarChart3 },
  { id: "cc-recruit", label: "Creator Recruitment", href: "/ugc/campaign-center/recruitment", icon: Users },
  { id: "cc-assets", label: "Campaign Assets", href: "/ugc/campaign-center/assets", icon: ImageIcon },
];

function resolveActive(pathname: string): string {
  if (pathname.startsWith("/ugc/campaign-center/create")) return "cc-create";
  if (pathname.startsWith("/ugc/campaign-center/drafts")) return "cc-drafts";
  if (pathname.startsWith("/ugc/campaign-center/active")) return "cc-active";
  if (pathname.startsWith("/ugc/campaign-center/completed")) return "cc-completed";
  if (pathname.startsWith("/ugc/campaign-center/analytics")) return "cc-analytics";
  if (pathname.startsWith("/ugc/campaign-center/recruitment")) return "cc-recruit";
  if (pathname.startsWith("/ugc/campaign-center/assets")) return "cc-assets";
  if (pathname.startsWith("/ugc/campaign-center")) return "cc-mine";
  if (pathname === "/ugc/dashboard" || pathname === "/ugc/dashboard/") return "dashboard";
  if (/^\/ugc\/[^/]+\/dashboard\/?$/.test(pathname)) return "projects";
  if (pathname.startsWith("/ugc/applications")) return "applications";
  if (pathname.startsWith("/ugc/campaigns")) return "projects";
  if (pathname.startsWith("/ugc/submissions")) return "submissions";
  if (pathname.startsWith("/ugc/analytics")) return "analytics";
  if (pathname.startsWith("/ugc/earnings")) return "earnings";
  if (pathname.startsWith("/ugc/payouts")) return "payouts";
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
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-[10px] px-2.5 py-[8px] text-[12px] font-medium transition-all duration-150",
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
  const activeId = resolveActive(pathname);
  const openAssistant = useAIStore((s) => s.openAssistant);

  return (
    <div className="flex h-full w-[220px] flex-col bg-white xl:w-[236px]">
      <div className="px-3.5 pb-2 pt-4">
        <h2 className="text-[12px] font-bold tracking-tight text-[#111827]">UGC &amp; Clipping</h2>
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
          Mission Control
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
        <ul className="space-y-[2px]">
          {PRIMARY_NAV.map((item) => (
            <li key={item.id}>
              <NavLink item={item} active={item.id === activeId} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        <div className="mt-4 px-2.5 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
            Campaign Center
          </p>
        </div>
        <ul className="space-y-[2px]">
          {CAMPAIGN_CENTER_NAV.map((item) => (
            <li key={item.id}>
              <NavLink item={item} active={item.id === activeId} onNavigate={onNavigate} />
            </li>
          ))}
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
                Your intelligent assistant for winning campaigns.
              </p>

              <button
                type="button"
                onClick={() => {
                  openAssistant(
                    "Help me find the best UGC and clipping campaigns to join right now.",
                  );
                  onNavigate?.();
                }}
                className="mt-3.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-white px-3 text-[11.5px] font-bold text-[#FF5A1F] shadow-[0_6px_18px_rgba(17,24,39,0.18)] transition-all duration-150 hover:bg-[#FFFAF7] hover:shadow-[0_8px_22px_rgba(17,24,39,0.22)]"
              >
                Ask AI Anything
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
