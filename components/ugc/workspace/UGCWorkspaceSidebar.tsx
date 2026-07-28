"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
  Sparkles,
  User,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";
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
  const openAssistant = useAIStore((s) => s.openAssistant);

  return (
    <div className="flex h-full w-[212px] flex-col bg-white xl:w-[228px]">
      <div className="px-3.5 pb-2 pt-3.5">
        <h2 className="text-[12px] font-bold tracking-tight text-[#111827]">UGC &amp; Clipping</h2>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "mt-2 flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-[10px] font-bold transition-all duration-150",
            activeId === "mission"
              ? "border-[#FF5A1F] bg-[#FFF0E8] text-[#FF5A1F] shadow-[0_1px_4px_rgba(255,90,31,0.12)]"
              : "border-[#FFE4D6] bg-[#FFF8F5] text-[#FF5A1F] hover:border-[#FF5A1F]/40 hover:bg-[#FFF0E8]",
          )}
        >
          <LayoutDashboard className="h-3 w-3" strokeWidth={2.25} />
          Mission Control
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeId;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-[12px] font-medium transition-all duration-150",
                    active
                      ? "bg-[#FFF0E8] font-semibold text-[#FF5A1F] shadow-[inset_0_0_0_1px_rgba(255,90,31,0.08)]"
                      : "text-[#4B5563] hover:bg-[#F8FAFC] hover:text-[#111827]",
                  )}
                >
                  <Icon
                    strokeWidth={active ? 2.25 : 1.85}
                    className={cn(
                      "h-[15px] w-[15px] shrink-0 transition-colors",
                      active ? "text-[#FF5A1F]" : "text-[#9CA3AF] group-hover:text-[#6B7280]",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Jimvio AI — flagship orange card */}
      <div className="p-2.5 pt-1">
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-[16px] p-3.5 shadow-[0_8px_28px_rgba(255,90,31,0.28),0_2px_8px_rgba(255,90,31,0.12)]"
          style={{
            background:
              "linear-gradient(160deg, #FF7A45 0%, #FF5A1F 42%, #E54E18 100%)",
          }}
        >
          {/* Soft glass highlights */}
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.28) 0%, transparent 55%), radial-gradient(90% 70% at 90% 100%, rgba(255,255,255,0.1) 0%, transparent 50%)",
            }}
          />
          <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

          <div className="relative z-[1]">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.25} />
              <span className="text-[13px] font-bold tracking-tight text-white">Jimvio AI</span>
            </div>
            <p className="text-[10.5px] leading-snug text-white/90">
              Your intelligent assistant for winning campaigns.
            </p>

            <button
              type="button"
              onClick={() => {
                openAssistant("Help me find the best UGC and clipping campaigns to join right now.");
                onNavigate?.();
              }}
              className="mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-full bg-white/95 px-3 text-[11px] font-bold text-[#FF5A1F] shadow-[0_2px_10px_rgba(17,24,39,0.12)] backdrop-blur-sm transition-all duration-150 hover:bg-white hover:shadow-[0_4px_14px_rgba(17,24,39,0.16)]"
            >
              Ask AI Anything
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </button>

            <div className="mt-2.5 flex justify-center">
              <div className="relative">
                <div className="absolute inset-x-2 bottom-0 h-3 rounded-full bg-[#FF8A50]/80 blur-md" />
                <Image
                  src="/hero/jimvio-ai-mascot-cutout.png"
                  alt="Jimvio AI"
                  width={88}
                  height={88}
                  className="relative h-auto w-[72px] object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.18)]"
                  priority={false}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
