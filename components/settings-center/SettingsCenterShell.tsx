"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Headphones, Menu, X } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import {
  SETTINGS_HELP_HREF,
  SETTINGS_NAV_ITEMS,
  getActiveSettingsId,
} from "@/lib/settings/nav";
import { publicProfilePath } from "@/lib/settings/profile";
import { SettingsCenterProvider } from "./settings-center-context";

export type SettingsAccountIdentity = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  username: string | null;
};

export function SettingsCenterShell({
  account,
  children,
}: {
  account: SettingsAccountIdentity;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const titleId = useId();

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menuButton = (
    <button
      type="button"
      onClick={toggle}
      className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#E5E7EB] bg-white text-[#111827] lg:hidden"
      aria-expanded={open}
      aria-controls="settings-nav-drawer"
      aria-label="Open settings menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );

  return (
    <SettingsCenterProvider value={{ openMenu: toggle, closeMenu: close, menuButton }}>
      <div className="bg-[#F7F8FA]">
        <div className="mx-auto flex w-full max-w-[1280px] gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <aside className="hidden w-[272px] shrink-0 lg:block">
            <div className="sticky top-[calc(var(--navbar-height)+1.25rem)]">
              <SettingsNavPanel account={account} pathname={pathname} />
            </div>
          </aside>

          <div className="min-w-0 flex-1 pb-24 lg:pb-10">{children}</div>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-[80] lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="Close settings menu"
          onClick={close}
          className={cn(
            "absolute inset-0 bg-[#111827]/40 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <nav
          id="settings-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-hidden={!open}
          inert={!open}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(100%,320px)] flex-col bg-white shadow-2xl transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-3">
            <p id={titleId} className="text-[15px] font-semibold text-[#111827]">
              Settings
            </p>
            <button
              type="button"
              onClick={close}
              className="grid h-10 w-10 place-items-center rounded-xl text-[#111827] hover:bg-[#F3F4F6]"
              aria-label="Close settings menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <SettingsNavPanel account={account} pathname={pathname} onNavigate={close} />
          </div>
        </nav>
      </div>
    </SettingsCenterProvider>
  );
}

function SettingsNavPanel({
  account,
  pathname,
  onNavigate,
}: {
  account: SettingsAccountIdentity;
  pathname: string;
  onNavigate?: () => void;
}) {
  const activeId = getActiveSettingsId(pathname);
  const profileHref = publicProfilePath(account.username);
  const initial = getInitials(account.displayName || account.email || "U") || "U";

  return (
    <div className="flex flex-col">
      {profileHref ? (
        <Link
          href={profileHref}
          onClick={onNavigate}
          className="mb-4 flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-[#F9FAFB]"
        >
          <AccountAvatar avatarUrl={account.avatarUrl} initial={initial} />
          <AccountCopy account={account} />
          <ChevronRight className="h-4 w-4 shrink-0 text-[#D1D5DB]" />
        </Link>
      ) : (
        <div className="mb-4 flex items-center gap-3 px-2 py-2">
          <AccountAvatar avatarUrl={account.avatarUrl} initial={initial} />
          <AccountCopy account={account} />
        </div>
      )}

      <ul className="space-y-0.5">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                  active
                    ? "bg-[#FFF4EE] text-[#FF5A1F]"
                    : "text-[#111827] hover:bg-[#F3F4F6]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-2xl border border-[#E8E8E8] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FFF4EE] text-[#FF5A1F]">
            <Headphones className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Need help?</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6B7280]">
              Visit the Help Center or contact support.
            </p>
          </div>
        </div>
        <Link
          href={SETTINGS_HELP_HREF}
          onClick={onNavigate}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#111827] hover:bg-[#F9FAFB]"
        >
          Get support
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function AccountAvatar({
  avatarUrl,
  initial,
}: {
  avatarUrl: string | null;
  initial: string;
}) {
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#FF5A1F] text-[13px] font-semibold text-white">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

function AccountCopy({ account }: { account: SettingsAccountIdentity }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[14px] font-semibold text-[#111827]">
        {account.displayName}
      </span>
      <span className="block truncate text-[12px] text-[#6B7280]">{account.email}</span>
    </span>
  );
}
