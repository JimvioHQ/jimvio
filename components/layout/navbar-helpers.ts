import React from "react";
import {
  Home, Users, Clapperboard, ShoppingBag, DollarSign,
  User, Factory, Package, BatteryCharging, Headphones,
  Laptop, Lamp, Smartphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NavLinkConfig } from "@/lib/platform-settings-shared";

export function useScrollDirection(threshold = 8) {
  const [hidden, setHidden] = React.useState(false);
  React.useEffect(() => {
    let prev = window.scrollY;
    const fn = () => {
      const cur = window.scrollY;
      if (Math.abs(cur - prev) < threshold) { prev = cur; return; }
      setHidden(cur > prev && cur > 60);
      prev = cur;
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [threshold]);
  return hidden;
}

export const TRENDING_SEARCHES: {
  label: string; count: string; icon: LucideIcon; color: string; bg: string;
}[] = [
  { label: "Wireless chargers", count: "142 products", icon: BatteryCharging, color: "#f97316", bg: "bg-orange-50 dark:bg-orange-500/10" },
  { label: "Wireless earbuds", count: "89 products", icon: Headphones, color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-500/10" },
  { label: "Laptop accessories", count: "230 products", icon: Laptop, color: "#8b5cf6", bg: "bg-violet-50 dark:bg-violet-500/10" },
  { label: "LED desk lamps", count: "77 products", icon: Lamp, color: "#eab308", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
  { label: "Phone stands", count: "190 products", icon: Smartphone, color: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
];

export function ensureCoreNavLinks(links: NavLinkConfig[]): NavLinkConfig[] {
  const hide = ["/vendors", "/influencers", "/influencers/browse", "/influencers/program", "/shorts"];
  const norm = (h: string) => h.replace(/\/$/, "") || "/";
  let out = links.filter((l) => {
    const h = norm(l.href);
    return h !== "/clips" && !hide.includes(h);
  });
  if (!out.some((l) => norm(l.href) === "/ugc")) out.push({ label: "UGC & Clipping", href: "/ugc" });
  if (!out.some((l) => norm(l.href) === "/marketplace")) out.push({ label: "Marketplace", href: "/marketplace" });
  if (!out.some((l) => norm(l.href) === "/communities")) out.push({ label: "Communities", href: "/c" });
  if (!out.some((l) => norm(l.href) === "/")) out.unshift({ label: "Home", href: "/" });
  const hi = out.findIndex((l) => norm(l.href) === "/");
  if (hi > 0) { const [home] = out.splice(hi, 1); out.unshift(home); }
  const mi = out.findIndex((l) => norm(l.href) === "/marketplace");
  if (mi > 1) { const [marketplace] = out.splice(mi, 1); out.splice(1, 0, marketplace); }
  return out;
}

export function iconForHref(href: string): LucideIcon {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return Home;
  if (h.startsWith("/communities")) return Users;
  if (h.startsWith("/ugc")) return Clapperboard;
  if (h.startsWith("/marketplace")) return ShoppingBag;
  if (h.startsWith("/affiliates")) return DollarSign;
  if (h.startsWith("/influencers")) return User;
  if (h.startsWith("/vendors")) return Factory;
  if (h.startsWith("/shorts")) return Clapperboard;
  return Package;
}

export function isActive(pathname: string, href: string) {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return pathname === "/";
  if (h === "/c") return pathname === "/c" || pathname.startsWith("/c/");
  return pathname === h || pathname.startsWith(`${h}/`);
}

export const DROPDOWN_CLOSE_DELAY = 220;
