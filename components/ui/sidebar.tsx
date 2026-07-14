"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface SidebarNavItemConfig {
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: string | number;
  onClick?: () => void;
  activeMatch?: (pathname: string) => boolean;
}

export interface SidebarSectionConfig {
  key: string;
  title: string;
  items: SidebarNavItemConfig[];
}

// ── Sidebar Header ────────────────────────────────────────────────────────────

interface SidebarHeaderProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onMobileClose?: () => void;
  collapsible?: boolean;
}

function SidebarLogoMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="relative shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" fill="none" width={size} height={size} className="block">
        <defs>
          <linearGradient id="j-logo-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fd5000" />
            <stop offset="100%" stopColor="var(--color-accent-hover)" />
          </linearGradient>
        </defs>
        <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="url(#j-logo-bg)" />
        <g transform="translate(6.5, 0)">
          <path
            d="M11 24c-2 0-4-.4-5.5-1.2a7.5 7.5 0 0 1-3-3.3c-.5-1-.5-2-.5-3h3.5c0 .7 0 1.3.3 1.8.5 1 1.5 1.7 3 1.7 2.2 0 3.7-1.5 3.7-4.3V8h4v6.7c0 2.7-.7 4.8-2 6.2-1.2 1.4-3 2.1-5.2 2.1Z"
            fill="#fff"
          />
        </g>
      </svg>
    </span>
  );
}

export function SidebarHeader({ collapsed, onToggle, onMobileClose, collapsible = false }: SidebarHeaderProps) {
  if (collapsed) {
    return (
      <div className="flex justify-center items-center h-14 flex-shrink-0">
        <button
          onClick={onToggle}
          aria-label={collapsible ? "Expand sidebar" : "Sidebar collapsed"}
          className="w-8 h-8 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{ borderRadius: "var(--radius-md)" }}
          disabled={!collapsible}
        >
          <SidebarLogoMark size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
      <Link href="/" onClick={onMobileClose} className="flex items-center gap-2.5 min-w-0">
        <SidebarLogoMark size={28} />
        <span
          className="text-[17px] font-semibold tracking-tight truncate font-[family-name:var(--font-family-display)]"
          style={{ color: "var(--color-text-primary)" }}
        >
          jim
          <span
            style={{
              background: "linear-gradient(135deg, #fd5000, #ff7a33)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            vio
          </span>
        </span>
      </Link>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          className="hidden lg:flex w-6 h-6 items-center justify-center transition-colors hover:bg-[var(--color-surface-secondary)] active:scale-95"
          style={{ borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)" }}
          disabled={!collapsible}
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      )}
      {onMobileClose && (
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Close sidebar"
          className="lg:hidden w-6 h-6 flex items-center justify-center transition-colors hover:bg-[var(--color-surface-secondary)] active:scale-95"
          style={{ borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)" }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Sidebar Nav Item ──────────────────────────────────────────────────────────

interface SidebarNavItemProps {
  item: SidebarNavItemConfig;
  active: boolean;
  collapsed?: boolean;
  badge?: string | number;
  locked?: boolean;
  onClick?: () => void;
}

export function SidebarNavItem({ item, active, collapsed, badge, locked, onClick }: SidebarNavItemProps) {
  const Icon = item.icon;
  const content = (
    <>
      {active && !collapsed && (
        <span
          className="absolute left-0 inset-y-[20%] w-[3px] rounded-r-full"
          style={{ backgroundColor: "var(--color-accent)" }}
        />
      )}
      <Icon
        className={cn("flex-shrink-0", collapsed ? "h-4 w-4" : "h-4 w-4")}
        style={{ color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {badge && !locked && (
            <span
              className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
              style={{
                backgroundColor: "var(--color-surface-secondary)",
                color: "var(--color-text-muted)",
              }}
            >
              {badge}
            </span>
          )}
          {locked && (
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Unlock
            </span>
          )}
        </>
      )}
    </>
  );

  const style = {
    borderRadius: "var(--radius-sm)",
    backgroundColor: active ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
    color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
    fontWeight: active ? 600 : 500,
    transition: "background-color 0.12s, color 0.12s",
  };

  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={() => { item.onClick?.(); onClick?.(); }}
        title={collapsed ? item.label : undefined}
        className={cn(
          "relative flex items-center gap-2.5 text-[13px] font-medium w-full text-left",
          collapsed ? "w-9 h-9 justify-center" : "px-2.5 py-2",
          !active && "hover:bg-[var(--color-surface-secondary)]"
        )}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={item.href ?? "#"}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 text-[13px] font-medium",
        collapsed ? "w-9 h-9 justify-center" : "px-2.5 py-2",
        !active && "hover:bg-[var(--color-surface-secondary)]"
      )}
      style={style}
    >
      {content}
    </Link>
  );
}

// ── Sidebar Section ───────────────────────────────────────────────────────────

interface SidebarSectionProps {
  section: SidebarSectionConfig;
  isOpen: boolean;
  onToggle: () => void;
  isActive: (href: string | undefined) => boolean;
  getBadge?: (label: string) => string | number | undefined;
  isLocked?: (item: SidebarNavItemConfig) => boolean;
  onItemClick?: () => void;
}

export function SidebarSection({
  section,
  isOpen,
  onToggle,
  isActive,
  getBadge,
  isLocked,
  onItemClick,
}: SidebarSectionProps) {
  return (
    <div className="mb-px">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
          "hover:bg-[var(--color-surface-secondary)]"
        )}
        style={{ borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)" }}
      >
        <span className="flex-1 text-left">{section.title}</span>
        <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.18, ease: "easeInOut" }}>
          <ChevronDown className="h-3 w-3" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <ul className="space-y-px mt-px">
              {section.items.map((item) => {
                const active = isActive(item.href ?? item.label);
                const badge = getBadge?.(item.label) ?? item.badge;
                const locked = isLocked?.(item) ?? false;
                return (
                  <li key={`${section.key}-${item.label}`}>
                    <SidebarNavItem
                      item={item}
                      active={active}
                      badge={badge}
                      locked={locked}
                      onClick={onItemClick}
                    />
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sidebar Profile ───────────────────────────────────────────────────────────

interface SidebarProfileProps {
  user: { email: string; full_name?: string | null; avatar_url?: string | null };
  collapsed?: boolean;
  onSettingsClick?: () => void;
  roles?: string[];
  signOutButton?: React.ReactNode;
}

export function SidebarProfile({ user, collapsed, onSettingsClick, roles, signOutButton }: SidebarProfileProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-2 flex-shrink-0">
        <Link
          href="/dashboard/settings"
          onClick={onSettingsClick}
          title="Settings"
          className="w-9 h-9 flex items-center justify-center"
        >
          <div className="h-7 w-7 rounded-lg shrink-0 transition-opacity hover:opacity-80 overflow-hidden"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white text-[9px] font-bold">
                {user.full_name?.[0] || user.email?.[0] || "U"}
              </div>
            )}
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 px-2.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <Link href="/dashboard/settings" onClick={onSettingsClick}>
          <div className="h-8 w-8 rounded-lg shrink-0 transition-opacity hover:opacity-80 overflow-hidden"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white text-[11px] font-bold">
                {user.full_name?.[0] || user.email?.[0] || "U"}
              </div>
            )}
          </div>
        </Link>
        <div className="min-w-0 flex-1 hidden sm:block">
          <Link href="/dashboard/settings" onClick={onSettingsClick}>
            <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: "var(--color-text-primary)" }}>
              {user.full_name?.split(" ")[0] || "Account"}
            </p>
          </Link>
          <div className="flex items-center gap-1.5 mt-px">
            <p className="text-[11px] truncate leading-tight" style={{ color: "var(--color-text-muted)" }}>
              {user.email}
            </p>
            {roles && roles.length > 0 && (
              <span
                className="text-[9px] font-semibold uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
              >
                {roles[0]}
              </span>
            )}
          </div>
        </div>
        {signOutButton}
      </div>
    </div>
  );
}

// ── Collapsed badge dot ───────────────────────────────────────────────────────

export function SidebarBadgeDot({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span
      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
      style={{ backgroundColor: "var(--color-accent)" }}
    />
  );
}
