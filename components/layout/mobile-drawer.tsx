"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, MessageSquare, Video, Settings,
  ShoppingCart, Home, ShoppingBag, Users, Clapperboard,
  BanknoteIcon, CircleHelp, ChevronDown, Sparkles,
  ArrowRight, LogOut, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { useCartStore } from "@/lib/store/use-cart-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CurrencySelector } from "@/context/CurrencyContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import JimvioLogo from "../ui/logo";
import type { NavLinkConfig } from "@/lib/platform-settings-shared";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  user?: { email: string; full_name?: string | null; avatar_url?: string | null } | null;
  pathname: string;
  marketplaceVariants: { title: string; desc: string; href: string; icon: LucideIcon; color: string }[];
  navLinks: NavLinkConfig[];
  openAssistant: () => void;
}

const accountLinks = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/messages", icon: MessageSquare, label: "Messages" },
  { href: "/dashboard/library", icon: Video, label: "Digital Library" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
      {children}
    </p>
  );
}

function NavRow({
  href, icon: Icon, label, active, badge, onClose,
}: { href: string; icon: LucideIcon; label: string; active: boolean; badge?: number; onClose: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[14px] font-medium transition-colors",
        active
          ? "border-[var(--color-accent)]/25 bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
          : "border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")} />
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function ExpandSection({
  id, icon: Icon, label, children, pathname, onClose,
}: { id: string; icon: LucideIcon; label: string; children: React.ReactNode; pathname: string; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (s: string) => setExpanded((p) => (p === s ? null : s));
  const isOpen = expanded === id;
  const isActive = pathname.startsWith("/marketplace");

  return (
    <div>
      <button
        type="button"
        onClick={() => toggle(id)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-[14px] font-medium transition-colors",
          isOpen || isActive
            ? "border-[var(--color-accent)]/25 bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
            : "border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]",
        )}
      >
        <Icon className={cn("size-4 shrink-0", isOpen || isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={cn("size-4 text-[var(--color-text-muted)] transition-transform", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 border-l border-[var(--color-border)] py-1 pl-3 ml-3 mt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubItem({ href, icon: Icon, color, title, desc, onClose }: {
  href: string; icon: LucideIcon; color: string; title: string; desc?: string; onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
    >
      <Icon className="size-3.5 shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {desc ? <span className="hidden text-[10px] text-[var(--color-text-muted)] sm:inline">{desc}</span> : null}
    </Link>
  );
}

export { NavRow, ExpandSection, SubItem };

export function MobileDrawer({
  open, onClose, user, pathname, marketplaceVariants, navLinks, openAssistant,
}: MobileDrawerProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { chatCount, cartCount } = useCartStore();
  const toggle = (s: string) => setExpanded((p) => (p === s ? null : s));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/50"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[9999] flex w-[min(100%,380px)] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl pointer-events-auto"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3.5">
              <JimvioLogo href="/" size="sm" onClick={onClose} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="border-b border-[var(--color-border)] px-4 py-4">
                {user ? (
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                    <button
                      type="button"
                      onClick={() => toggle("account")}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <Avatar className="size-10 shrink-0 border border-[var(--color-border)]">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-[var(--color-accent)]/10 text-[11px] font-bold text-[var(--color-accent)]">
                          {user.full_name?.[0] || user.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                          {user.full_name || "My account"}
                        </p>
                        <p className="truncate text-[11px] text-[var(--color-text-muted)]">{user.email}</p>
                      </div>
                      <ChevronDown className={cn("size-4 shrink-0 text-[var(--color-text-muted)] transition-transform", expanded === "account" && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {expanded === "account" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-[var(--color-border)]"
                        >
                          <div className="space-y-0.5 p-2">
                            {accountLinks.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={onClose}
                                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
                              >
                                <link.icon className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                                {link.label}
                                {link.href === "/dashboard/messages" && chatCount > 0 && (
                                  <span className="ml-auto rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {chatCount > 99 ? "99+" : chatCount}
                                  </span>
                                )}
                              </Link>
                            ))}
                            <div className="my-1 h-px bg-[var(--color-border)]" />
                            <button
                              type="button"
                              onClick={async () => { await signOut(); window.location.href = "/"; }}
                              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-500/5"
                            >
                              <LogOut className="size-4 shrink-0" />
                              Sign out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[13px] text-[var(--color-text-muted)]">Sign in to track orders, messages, and earnings.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={onClose}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-[13px] font-semibold text-[var(--color-text-primary)]"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/register"
                        onClick={onClose}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[13px] font-bold text-white"
                      >
                        Join free
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-b border-[var(--color-border)] px-4 py-4">
                <button
                  type="button"
                  onClick={() => { openAssistant(); onClose(); }}
                  className="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3 text-left transition-colors hover:border-[var(--color-accent)]/30"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                    <Sparkles className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[var(--color-text-primary)]">Jimvio AI</span>
                    <span className="block text-[12px] text-[var(--color-text-muted)]">Products, campaigns, and growth tips</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                </button>
              </div>

              {user && (
                <div className="grid grid-cols-2 gap-2 border-b border-[var(--color-border)] px-4 py-4">
                  <Link
                    href="/dashboard/messages"
                    onClick={onClose}
                    className="relative flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] py-2.5 text-[13px] font-semibold text-[var(--color-text-primary)]"
                  >
                    <MessageSquare className="size-4 text-[var(--color-accent)]" />
                    Messages
                    {chatCount > 0 && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {chatCount > 99 ? "99+" : chatCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/cart"
                    onClick={onClose}
                    className="relative flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] py-2.5 text-[13px] font-semibold text-[var(--color-text-primary)]"
                  >
                    <ShoppingCart className="size-4 text-[var(--color-text-muted)]" />
                    Cart
                    {cartCount > 0 && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}

              <div className="px-4 py-4">
                <SectionLabel>Menu</SectionLabel>
                <div className="space-y-1">
                  <NavRow href="/" icon={Home} label="Home" active={pathname === "/"} onClose={onClose} />
                  <ExpandSection id="market" icon={ShoppingBag} label="Marketplace" pathname={pathname} onClose={onClose}>
                    {marketplaceVariants.map((v) => (
                      <SubItem key={v.href} href={v.href} icon={v.icon} color={v.color} title={v.title} desc={v.desc} onClose={onClose} />
                    ))}
                  </ExpandSection>
                  <NavRow href="/c" icon={Users} label="Communities" active={pathname.startsWith("/c") || pathname.startsWith("/communities")} onClose={onClose} />
                  <NavRow href="/ugc" icon={Clapperboard} label="UGC & Clipping" active={pathname.startsWith("/ugc")} onClose={onClose} />
                  <NavRow href="/affiliates" icon={BanknoteIcon} label="Affiliates" active={pathname.startsWith("/affiliates")} onClose={onClose} />
                  <NavRow href="/help" icon={CircleHelp} label="Help Center" active={pathname.startsWith("/help")} onClose={onClose} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-[var(--color-text-muted)]">Theme</span>
                <ThemeToggle />
              </div>
              <CurrencySelector className="h-8 border-0 bg-transparent text-[12px] font-medium text-[var(--color-text-muted)]" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
