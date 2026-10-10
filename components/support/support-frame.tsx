"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Headset,
  LayoutGrid,
  LifeBuoy,
  Ticket,
} from "lucide-react";
import { SUPPORT_CATEGORIES } from "@/lib/support/types";
import { cn } from "@/lib/utils";

const LiveSupportWidget = dynamic(
  () => import("@/components/support/live-support-widget").then((m) => ({ default: m.LiveSupportWidget })),
  { ssr: false },
);

const LINKS = [
  { href: "/help", label: "Support Center", icon: LayoutGrid },
  { href: "/help/articles", label: "Help Articles", icon: BookOpen },
  { href: "/help/tickets", label: "My Tickets", icon: Ticket },
  { href: "/help/contact", label: "Contact Support", icon: Headset },
];

export function SupportNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav
      aria-label="Support"
      className="lg:sticky lg:top-[var(--navbar-height)] lg:h-[calc(100dvh-var(--navbar-height))] lg:overflow-y-auto lg:overscroll-y-contain lg:py-6"
    >
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-[#111827] lg:hidden"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Support menu
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      <div className={cn("space-y-6", !open && "hidden lg:block")}>
        <ul className="space-y-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/help"
                ? pathname === "/help"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
                    active ? "bg-[#FFF1EA] text-[#FF5A1F]" : "text-[#374151] hover:bg-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div>
          <p className="flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
            Topics
          </p>
          <ul className="mt-2 space-y-1">
            {SUPPORT_CATEGORIES.map((category) => {
              const active = pathname === category.href || pathname.startsWith(`${category.href}/`);
              return (
              <li key={category.id}>
                <Link
                  href={category.href}
                  className={cn(
                    "block rounded-lg px-3 py-1.5 text-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
                    active ? "bg-[#FFF1EA] font-medium text-[#FF5A1F]" : "text-[#374151]",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {category.title}
                </Link>
              </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export function SupportFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto grid max-w-8xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:px-8 lg:py-0">
        <SupportNav />
        <div className="min-w-0 py-2 lg:py-8">{children}</div>
      </div>
      <LiveSupportWidget />
    </div>
  );
}
