"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, LayoutGrid, Plus, Users } from "lucide-react";
import { useOwnerConsoleUiStore } from "@/lib/community/owner-console";
import { cn } from "@/lib/utils";
import { useOwnerConsole } from "./OwnerConsoleContext";

/** Phone bottom bar for Manage Community (design spec). */
export function ManageBottomNav() {
  const { community, hrefSection } = useOwnerConsole();
  const pathname = usePathname();
  const setMobileOpen = useOwnerConsoleUiStore((s) => s.setSidebarMobileOpen);
  if (!community) return null;

  const overview = hrefSection().split("?")[0];
  const spaces = hrefSection("spaces").split("?")[0];
  const members = hrefSection("members").split("?")[0];
  const is = (p: string, exact = false) => (exact ? pathname === p || pathname === `${p}/` : pathname.startsWith(p));
  const item = (active: boolean) =>
    cn(
      "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
      active ? "text-[#FF5A1F]" : "text-[#6B7280]",
    );

  return (
    <nav
      aria-label="Manage community"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch">
        <Link href={overview} className={item(is(overview, true))}>
          {is(overview, true) ? <span className="absolute top-0 h-0.5 w-10 rounded-full bg-[#FF5A1F]" aria-hidden /> : null}
          <Home className="h-5 w-5" aria-hidden />
          Overview
        </Link>
        <Link href={spaces} className={item(is(spaces))}>
          <Layers className="h-5 w-5" aria-hidden />
          Spaces
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <Link
            href={hrefSection("content", { action: "create" })}
            aria-label="Create"
            className="-mt-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#FF5A1F] text-white shadow-[0_8px_20px_rgba(255,90,31,0.35)]"
          >
            <Plus className="h-7 w-7" />
          </Link>
        </div>
        <Link href={members} className={item(is(members))}>
          <Users className="h-5 w-5" aria-hidden />
          Members
        </Link>
        <button type="button" onClick={() => setMobileOpen(true)} className={item(false)}>
          <LayoutGrid className="h-5 w-5" aria-hidden />
          More
        </button>
      </div>
    </nav>
  );
}
