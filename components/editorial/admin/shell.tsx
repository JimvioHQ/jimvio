"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  FolderTree,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  Menu,
  Newspaper,
  Rss,
  Settings,
  Tags,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/media/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/media/admin/articles", label: "Articles", icon: Newspaper, exact: false },
  { href: "/media/admin/categories", label: "Categories", icon: FolderTree, exact: false },
  { href: "/media/admin/authors", label: "Author Management", icon: Users, exact: false },
  { href: "/media/admin/library", label: "Media Library", icon: ImageIcon, exact: false },
  { href: "/media/admin/tags", label: "Tags", icon: Tags, exact: false },
  { href: "/media/admin/scheduled", label: "Scheduled", icon: CalendarClock, exact: false },
  { href: "/media/admin/sources", label: "Sources", icon: Rss, exact: false },
  { href: "/media/admin/ingestion", label: "Ingestion", icon: Inbox, exact: false },
  { href: "/media/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { href: "/media/admin/settings", label: "Settings", icon: Settings, exact: false },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Editorial" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/75 hover:bg-white/5 hover:text-white",
              active && "bg-[#fd5000] text-white hover:bg-[#fd5000]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/media/admin";
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#141820]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-[#0c1222] px-3 py-4 text-white lg:flex">
          <Link href="/media/admin" className="mb-6 flex items-center gap-2.5 px-2">
            <Image src="/jimvio-logo.svg" alt="" width={32} height={32} unoptimized className="h-8 w-8" />
            <span>
              <span className="block text-sm font-extrabold leading-tight">
                Jimvio <span className="text-[#fd5000]">Media</span>
              </span>
              <span className="text-[11px] text-white/55">Admin Portal</span>
            </span>
          </Link>
          <NavLinks pathname={pathname} />
          <Link href="/media" className="mt-auto px-3 pt-6 text-xs font-medium text-white/50 hover:text-white">
            View public site
          </Link>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex h-14 items-center gap-3 border-b border-[#eceff3] bg-[#0c1222] px-4 text-white lg:hidden">
            <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">Editorial menu</span>
            </button>
            <span className="text-sm font-extrabold">
              Jimvio <span className="text-[#fd5000]">Media</span>
            </span>
          </div>
          {open ? (
            <div className="border-b border-white/10 bg-[#0c1222] px-3 py-3 lg:hidden">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
          ) : null}
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}


