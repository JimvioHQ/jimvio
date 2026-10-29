"use client";

import { createElement, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Globe,
  Link2,
  ListChecks,
  Palette,
  Settings2,
  Trash2,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";
import { hasCapability } from "@/lib/community/workspace/permissions";
import {
  SETTINGS_GROUPS,
  settingsGroup,
  settingsGroupForTab,
  type SettingsGroupId,
} from "@/lib/community/owner-console/settings";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";
import { cn } from "@/lib/utils";
import { SettingsSectionForm } from "./SettingsSectionForm";
import { useOwnerSettings } from "./useOwnerSettings";

const GROUP_ICONS: Record<SettingsGroupId, LucideIcon> = {
  general: ListChecks,
  visibility: Globe,
  profile: UserCircle2,
  access: Crown,
  customization: Palette,
  integrations: Link2,
  advanced: Settings2,
  danger: Trash2,
};

function useIsDesktop() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

function setTabInUrl(tab: string | null) {
  try {
    const url = new URL(window.location.href);
    if (tab) url.searchParams.set("tab", tab);
    else url.searchParams.delete("tab");
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {
    /* URL update is a convenience only */
  }
}

/**
 * Community Settings — laptop: group list + form side by side; phone: a list
 * of groups, then one page per group with a back button.
 */
export function SettingsManagement({ embedded = false }: { embedded?: boolean } = {}) {
  const { community, role } = useOwnerConsole();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const canView = hasCapability(role, "settings.view") || hasCapability(role, "settings.manage");
  const canManage = hasCapability(role, "settings.manage");
  const canSecurity = hasCapability(role, "security.manage") || canManage;
  const isOwner = role === "owner";

  const { settings, loading, saving, error, save, danger, exportData } = useOwnerSettings(
    community?.id ?? null,
  );

  const [group, setGroup] = useState<SettingsGroupId | null>(() =>
    settingsGroupForTab(searchParams.get("tab")),
  );
  useEffect(() => {
    setGroup(settingsGroupForTab(searchParams.get("tab")));
  }, [searchParams]);

  const openGroup = useCallback((id: SettingsGroupId | null) => {
    setGroup(id);
    setTabInUrl(id);
    if (id) window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const groups = SETTINGS_GROUPS.filter((g) => g.id !== "danger" || isOwner || canManage);

  if (!community) {
    return <p className="text-sm text-[var(--color-text-muted)]">Select a community to manage settings.</p>;
  }
  if (!canView) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-10 text-center">
        <p className="text-sm font-semibold text-[#111827]">Settings require staff access</p>
        <p className="mt-1 text-[13px] text-[#6B7280]">Your role ({role}) cannot change community settings.</p>
      </div>
    );
  }
  if (isDesktop === null) {
    return <div className="h-64 animate-pulse rounded-2xl bg-white" aria-hidden />;
  }

  const renderGroupBody = (id: SettingsGroupId) => {
    const g = settingsGroup(id);
    if (error) return <p className="text-sm text-red-600" role="alert">{error}</p>;
    if (loading || !settings) {
      return <p className="py-12 text-center text-sm text-[#9CA3AF]">Loading settings…</p>;
    }
    return (
      <div className="space-y-4">
        {g.sections.map((sectionId) => (
          <SettingsSectionForm
            key={`${settings.communityId}-${sectionId}`}
            section={sectionId}
            settings={settings}
            canManage={canManage}
            canSecurity={canSecurity}
            isOwner={isOwner}
            saving={saving}
            onSave={(patch) => save(patch, sectionId)}
            onDanger={danger}
            onExport={() => void exportData()}
          />
        ))}
      </div>
    );
  };

  const groupButton = (id: SettingsGroupId, active: boolean, compact: boolean) => {
    const g = settingsGroup(id);
    const isDanger = id === "danger";
    return (
      <button
        key={id}
        type="button"
        onClick={() => openGroup(id)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-xl border px-3.5 text-left transition",
          compact ? "py-3" : "py-3.5",
          active
            ? "border-[#FF5A1F]/30 bg-[#FFF4EE]"
            : "border-[#EEF0F3] bg-white hover:border-[#E5E7EB] hover:bg-[#FAFAFB]",
        )}
      >
        {active ? <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-[#FF5A1F]" aria-hidden /> : null}
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isDanger ? "bg-red-50 text-[#DC2626]" : active ? "bg-white text-[#FF5A1F]" : "bg-[#F8FAFC] text-[#374151]",
          )}
        >
          {createElement(GROUP_ICONS[id], { className: "h-[18px] w-[18px]", "aria-hidden": true })}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[14px] font-semibold", isDanger ? "text-[#DC2626]" : active ? "text-[#FF5A1F]" : "text-[#111827]")}>
            {g.label}
          </span>
          <span className="block truncate text-[12px] text-[#6B7280]">{g.description}</span>
        </span>
        {!isDesktop ? <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" aria-hidden /> : null}
      </button>
    );
  };

  // ── Phone: list → detail page ─────────────────────────────────────────
  if (!isDesktop) {
    if (!group) {
      return (
        <div className="space-y-4">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Settings</h1>
            <p className="mt-1 text-[14px] text-[#6B7280]">Manage your community and customize the experience.</p>
          </div>
          <div className="space-y-2">{groups.map((g) => groupButton(g.id, false, true))}</div>
        </div>
      );
    }
    const g = settingsGroup(group);
    return (
      <div className="space-y-4 pb-6">
        <button
          type="button"
          onClick={() => openGroup(null)}
          className="-ml-1 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-[14px] font-medium text-[#374151]"
        >
          <ChevronLeft className="h-5 w-5" /> Settings
        </button>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">{g.title}</h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">{g.subtitle}</p>
        </div>
        {renderGroupBody(group)}
      </div>
    );
  }

  // ── Laptop: card with group list + form ───────────────────────────────
  const active = group ?? "general";
  const g = settingsGroup(active);
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="flex items-center gap-3 border-b border-[#EEF0F3] px-5 py-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2563EB]">
          <Settings2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold text-[#111827]">Community Settings</h2>
          <p className="text-[13px] text-[#6B7280]">Manage your community details, appearance, access, and more.</p>
        </div>
      </header>
      <div className="grid grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label="Settings categories" className="space-y-2 border-r border-[#EEF0F3] p-3">
          {groups.map((x) => groupButton(x.id, x.id === active, false))}
        </nav>
        <div className="min-w-0 p-5">
          <div className="mb-4">
            <h3 className="text-[18px] font-bold text-[#111827]">{g.title}</h3>
            <p className="text-[13px] text-[#6B7280]">{g.subtitle}</p>
          </div>
          {renderGroupBody(active)}
        </div>
      </div>
      {embedded ? null : null}
    </section>
  );
}
