"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  User,
  ShoppingCart,
  MessageCircle,
  Menu,
  X,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Settings,
  LogOut,
  TrendingUp,
  Video,
  Factory,
  Plus,
  Home,
  ShoppingBag,
  Package,
  Users,
  Search,
  Command,
  ChevronDown,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { useCartStore } from "@/lib/store/use-cart-store";
import type { MarketingSettings, NavLinkConfig } from "@/lib/platform-settings-shared";
import { NavbarSearch } from "@/components/layout/navbar-search";
import { CurrencySelector } from "@/context/CurrencyContext";

interface NavbarProps {
  user?: { email: string; full_name?: string | null; avatar_url?: string | null } | null;
  marketing: MarketingSettings;
}

function ensureCommunitiesNavLink(links: NavLinkConfig[]): NavLinkConfig[] {
  const norm = (href: string) => href.replace(/\/$/, "") || "/";
  if (links.some((l) => norm(l.href) === "/communities")) return links;
  const insert: NavLinkConfig = { label: "Communities", href: "/communities" };
  const homeIdx = links.findIndex((l) => norm(l.href) === "/");
  if (homeIdx === -1) return [insert, ...links];
  return [...links.slice(0, homeIdx + 1), insert, ...links.slice(homeIdx + 1)];
}

function iconForNavHref(href: string): LucideIcon {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return Home;
  if (h.startsWith("/communities")) return Users;
  if (h.startsWith("/marketplace")) return ShoppingBag;
  if (h.startsWith("/affiliates")) return TrendingUp;
  if (h.startsWith("/influencers")) return Video;
  if (h.startsWith("/vendors")) return Factory;
  if (h.startsWith("/clips")) return Video;
  return Package;
}

function linkIsActive(pathname: string, href: string): boolean {
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return pathname === "/";
  return pathname === h || pathname.startsWith(`${h}/`);
}

export function Navbar({ user, marketing }: NavbarProps) {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const { cartCount, chatCount, refreshCounts } = useCartStore();
  const pathname = usePathname();
  const router = useRouter();

  const navLinks = ensureCommunitiesNavLink(marketing.nav_links ?? []);
  const localeStrip = (marketing.locale_strip?.trim() || "EN · USD").trim();

  const navHeight = useTransform(scrollY, [0, 80], [102, 72]);
  const topBarOpacity = useTransform(scrollY, [0, 40], [1, 0]);
  const topBarHeight = useTransform(scrollY, [0, 40], [32, 0]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 15);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (user) refreshCounts();
  }, [user, refreshCounts]);

  const runSearch = useCallback(
    (override?: string) => {
      const term = (override ?? searchQ).trim();
      const params = new URLSearchParams();
      if (term) params.set("q", term);
      const qs = params.toString();
      router.push(qs ? `/marketplace?${qs}` : "/marketplace");
      setMobileOpen(false);
    },
    [router, searchQ],
  );

  const solutions = [
    { title: "Marketplace", desc: "Discover premium products", href: "/marketplace", icon: ShoppingBag, color: "text-orange-500" },
    { title: "Viral Clips", desc: "Video-driven commerce", href: "/clips", icon: Video, color: "text-blue-500" },
    { title: "Communities", desc: "Global trader networking", href: "/communities", icon: Users, color: "text-emerald-500" },
    { title: "Affiliates", desc: "Drive growth & earn", href: "/affiliates", icon: TrendingUp, color: "text-purple-500" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] w-full px-0 sm:px-4 lg:px-8 pt-0 sm:pt-2 pointer-events-none isolate">
      <motion.div 
        style={{ height: navHeight }}
        className={cn(
          "mx-auto w-full max-w-[1536px] relative pointer-events-auto transition-all duration-500 sm:rounded-[28px] border-b sm:border border-white/20 bg-white/80 backdrop-blur-3xl shadow-[0_15px_40px_rgba(0,0,0,0.06)] flex flex-col items-stretch overflow-visible group/nav",
          isScrolled && "sm:shadow-[0_20px_60px_rgba(0,0,0,0.12)] border-white/40 backdrop-saturate-150"
        )}
      >
        {/* DESKTOP TOP STRIP */}
        <motion.div 
          style={{ height: topBarHeight, opacity: topBarOpacity }}
          className="border-b border-zinc-100/50 flex items-center justify-between px-8 md:px-12 transition-all shrink-0 overflow-hidden"
        >
           <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 tracking-widest uppercase">
                 <Globe className="h-3 w-3 text-[#f97316]" /> {localeStrip}
              </span>
              <CurrencySelector className="h-5 rounded-lg bg-transparent border-0 px-1 text-[10px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors" />
           </div>
           <div className="flex items-center gap-6">
              <Link href="/help" className="text-[10px] font-black tracking-wider text-zinc-400 hover:text-[#f97316] transition-all uppercase">Support</Link>
              <Link href="/vendors" className="text-[10px] font-black tracking-wider text-zinc-400 hover:text-zinc-800 transition-all uppercase">Vendors</Link>
           </div>
        </motion.div>

        {/* MAIN NAVIGATION BAR */}
        <div className="flex-1 flex items-center px-6 sm:px-10 gap-5 sm:gap-8 overflow-visible">
          {/* Logo */}
          <Link href="/" className="relative shrink-0 transition-transform active:scale-95 duration-300">
             <Image src="/jimvio-logo.png" alt="Jimvio" width={140} height={38} className="w-[100px] sm:w-[130px] h-auto object-contain" priority />
          </Link>

          {/* Desktop Central Links */}
          <div className="hidden lg:flex items-center gap-1">
             <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="px-4 py-2 rounded-2xl text-[14px] font-black text-zinc-600 hover:text-zinc-900 transition-all flex items-center gap-1.5 group">
                     Explore <ChevronDown className="h-3.5 w-3.5 opacity-40 group-hover:rotate-180 transition-transform" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[360px] p-3 rounded-[32px] shadow-[0_32px_80px_rgba(0,0,0,0.15)] border-white/20 backdrop-blur-3xl bg-white/95 mt-4 grid grid-cols-1 gap-1">
                   {solutions.map(s => (
                      <DropdownMenuItem key={s.href} asChild className="p-3 rounded-2xl border border-transparent focus:bg-zinc-50 cursor-pointer group">
                         <Link href={s.href} className="flex items-center gap-4">
                            <div className={cn("h-10 w-10 rounded-xl bg-orange-50/10 flex items-center justify-center shrink-0", s.color)}><s.icon className="h-5 w-5" /></div>
                            <div className="min-w-0">
                               <p className="text-[14px] font-black text-zinc-900 leading-none mb-1">{s.title}</p>
                               <p className="text-[11px] font-bold text-zinc-400 leading-tight truncate">{s.desc}</p>
                            </div>
                         </Link>
                      </DropdownMenuItem>
                   ))}
                </DropdownMenuContent>
             </DropdownMenu>

             {navLinks.slice(0, 3).map((item) => {
               const active = linkIsActive(pathname, item.href);
               return (
                 <Link
                   key={item.href}
                   href={item.href}
                   className={cn(
                     "px-4 py-2 rounded-2xl text-[14px] font-black transition-all",
                     active ? "text-[#f97316] bg-orange-50/50" : "text-zinc-500 hover:text-zinc-900"
                   )}
                 >
                   {item.label}
                 </Link>
               );
             })}
          </div>

          {/* Action Center (Flexible) */}
          <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-3 ml-auto">
             <div className="hidden md:block flex-initial max-w-[420px] w-full mr-2">
                <NavbarSearch searchQ={searchQ} setSearchQ={setSearchQ} placeholder={marketing.search_placeholder} isScrolled={isScrolled} variant="desktop" runSearch={runSearch} navLinks={navLinks} />
             </div>

             {/* Functional Icons (RE-ADDED MESSAGE ICON) */}
             <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
                <Link href="/messages" className="relative p-2.5 rounded-full hover:bg-zinc-100 transition-all group lg:flex items-center justify-center">
                   <MessageCircle className="h-5.5 w-5.5 text-zinc-800 transition-transform group-hover:rotate-6" />
                   {chatCount > 0 && <span className="absolute -top-1 -right-1 h-[20px] min-w-[20px] bg-[#f97316] text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-white animate-pulse">{chatCount}</span>}
                </Link>
                <Link href="/cart" className="relative p-2.5 rounded-full hover:bg-zinc-100 transition-all group flex items-center justify-center">
                   <ShoppingCart className="h-5.5 w-5.5 text-zinc-800 transition-transform group-hover:-rotate-6" />
                   {cartCount > 0 && <span className="absolute -top-1 -right-1 h-[20px] min-w-[20px] bg-zinc-900 text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-white">{cartCount}</span>}
                </Link>
             </div>

             <div className="h-8 w-[1px] bg-zinc-200/50 hidden lg:block mx-1" />

             {user ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 p-1 xl:pr-3.5 rounded-full bg-zinc-50 border border-zinc-100 hover:bg-white hover:shadow-xl hover:border-zinc-200 transition-all active:scale-95 group shrink-0">
                       <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm flex-shrink-0">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white font-black text-[12px] uppercase">{user.full_name?.[0]}</AvatarFallback>
                       </Avatar>
                       <span className="hidden xl:block text-[13px] font-black text-zinc-900 truncate max-w-[140px]">{user.full_name?.split(" ")[0]}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-[32px] p-3 shadow-2xl border-white/20 bg-white/95 mt-4">
                    <div className="p-4 bg-zinc-50 rounded-[24px] mb-2">
                       <p className="text-[15px] font-black text-zinc-900 leading-tight">{user.full_name}</p>
                       <p className="text-[11px] font-medium text-zinc-500 mt-1 truncate">{user.email}</p>
                    </div>
                    <DropdownMenuItem asChild className="rounded-2xl py-3 font-bold text-zinc-600 focus:bg-zinc-50 focus:text-[#f97316] cursor-pointer">
                      <Link href="/dashboard"><LayoutDashboard className="h-4 w-4 mr-3" /> Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-2xl py-3 font-bold text-zinc-600 focus:bg-zinc-50 focus:text-zinc-900 cursor-pointer">
                      <Link href="/dashboard/settings"><Settings className="h-4 w-4 mr-3" /> My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="mx-2 bg-zinc-100/50" />
                    <DropdownMenuItem onSelect={async () => { await signOut(); window.location.href = "/"; }} className="rounded-2xl py-3 font-bold text-red-500 focus:bg-red-50 cursor-pointer">
                      <LogOut className="h-4 w-4 mr-3" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
             ) : (
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                   <Link href="/login" className="hidden sm:block px-4 py-2 text-[13px] font-black text-zinc-500 hover:text-zinc-900 transition-colors">Log In</Link>
                   <Button asChild className="h-10 sm:h-11 rounded-full px-5 sm:px-7 text-[13px] font-black bg-zinc-900 hover:bg-black text-white shadow-xl shadow-black/10 active:scale-95 transition-all">
                      <Link href="/register">Join Free</Link>
                   </Button>
                </div>
             )}

             <button onClick={() => setMobileOpen(true)} className="md:hidden p-2.5 rounded-full bg-zinc-50 border border-zinc-100 text-zinc-900 shadow-sm active:scale-90 transition-all shrink-0">
                <Menu className="h-6 w-6" />
             </button>
          </div>
        </div>
      </motion.div>

      {/* REFINED MOBILE INTERFACE (CONTROL CENTER STYLE) */}
      {portalReady && createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/30 backdrop-blur-md z-[9998] pointer-events-auto" />
              <motion.div initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 260 }} className="fixed inset-y-3 right-3 w-[min(100%-24px,380px)] bg-white z-[9999] shadow-2xl flex flex-col p-6 pointer-events-auto rounded-[40px] border border-white/20">
                 {/* Mobile Header Quick Actions */}
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                       <Link href="/messages" onClick={() => setMobileOpen(false)} className="relative h-11 w-11 rounded-full bg-zinc-50 flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-zinc-900" />
                          {chatCount > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-[#f97316] text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-white">{chatCount}</span>}
                       </Link>
                       <Link href="/cart" onClick={() => setMobileOpen(false)} className="relative h-11 w-11 rounded-full bg-orange-50/50 flex items-center justify-center text-[#f97316]">
                          <ShoppingCart className="h-5 w-5" />
                          {cartCount > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-zinc-900 text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-white">{cartCount}</span>}
                       </Link>
                    </div>
                    <button onClick={() => setMobileOpen(false)} className="h-11 w-11 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                       <X className="h-5 w-5" />
                    </button>
                 </div>
                 
                 <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar pb-6">
                    <div>
                       <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest pl-4 mb-4">Marketplace Engine</h4>
                       <div className="grid grid-cols-1 gap-2">
                          {solutions.map(s => (
                             <Link key={s.href} href={s.href} onClick={() => setMobileOpen(false)} className="flex items-center justify-between p-5 rounded-[24px] bg-zinc-50 border border-transparent hover:border-zinc-100 transition-all group">
                                <div className="flex items-center gap-4">
                                   <div className={cn("h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center", s.color)}><s.icon className="h-5 w-5" /></div>
                                   <div className="min-w-0">
                                      <p className="text-[16px] font-black text-zinc-900">{s.title}</p>
                                      <p className="text-[10px] font-bold text-zinc-400 -mt-0.5">{s.desc}</p>
                                   </div>
                                </div>
                                <Plus className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </Link>
                          ))}
                       </div>
                    </div>

                    <div>
                       <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest pl-4 mb-4">Other Services</h4>
                       <div className="flex flex-col gap-1">
                          {navLinks.map((item) => {
                             const Icon = iconForNavHref(item.href);
                             const active = linkIsActive(pathname, item.href);
                             if (solutions.some(s => s.href === item.href)) return null;
                             return (
                                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                                  className={cn("flex items-center justify-between px-6 py-4 rounded-[20px] text-[15px] font-black transition-all",
                                     active ? "text-[#f97316]" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                                  )}>
                                   <div className="flex items-center gap-4"><Icon className="h-5 w-5 opacity-30" /> {item.label}</div>
                                </Link>
                             )
                          })}
                       </div>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-zinc-100 mt-auto">
                    {user ? (
                       <Button asChild className="w-full h-15 rounded-[28px] font-black bg-zinc-900 text-white text-[17px] shadow-xl">
                          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>My Dashboard</Link>
                       </Button>
                    ) : (
                       <div className="grid grid-cols-2 gap-3">
                          <Button asChild variant="outline" className="h-14 rounded-[24px] border-zinc-100 font-black text-zinc-500">
                             <Link href="/login" onClick={() => setMobileOpen(false)}>Log In</Link>
                          </Button>
                          <Button asChild className="h-14 rounded-[24px] font-black bg-[#f97316] hover:bg-[#ea580c] shadow-xl shadow-orange-500/20 text-white">
                             <Link href="/register" onClick={() => setMobileOpen(false)}>Join Free</Link>
                          </Button>
                       </div>
                    )}
                 </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
}
