"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, ShoppingBag, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/#trending-clips", label: "Discover", icon: Compass },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/communities", label: "Community", icon: Users },
  { href: "/dashboard", label: "Profile", icon: User },
];

export function HomeBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#f0f0f0] safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-14 px-2">
        {items.map(({ href, label, icon: Icon }) => {
          const isRoot = href === "/";
          const isHash = href.startsWith("/#");
          const isActive = isRoot ? pathname === "/" : isHash ? pathname === "/" : pathname === href || pathname.startsWith(href);
          return (
            <Link
              key={href + label}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-w-0 rounded-xl transition-colors",
                isActive ? "text-[#f97316]" : "text-[#9ca3af]"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-bold truncate w-full text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
