"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SUPPORT_CATEGORIES } from "@/lib/support/types";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/help", label: "Support Center" },
  { href: "/help/articles", label: "Help Articles" },
  { href: "/help/tickets", label: "My Tickets" },
  { href: "/help/contact", label: "Contact Support" },
];

export function SupportNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Support" className="lg:sticky lg:top-24">
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
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
                    active ? "bg-[#FFF1EA] text-[#FF5A1F]" : "text-[#374151] hover:bg-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Topics</p>
          <ul className="mt-2 space-y-1">
            {SUPPORT_CATEGORIES.map((category) => (
              <li key={category.id}>
                <Link
                  href={category.href}
                  className="block rounded-lg px-3 py-1.5 text-sm text-[#374151] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
                >
                  {category.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export function SupportFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto grid max-w-8xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <SupportNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
