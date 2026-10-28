"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { hasCapability } from "@/lib/community/workspace/permissions";
import {
  SETTINGS_SECTION_DESCRIPTIONS,
  SETTINGS_SECTION_LABELS,
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from "@/lib/community/owner-console/settings";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";
import { SettingsSectionForm } from "./SettingsSectionForm";
import { useOwnerSettings } from "./useOwnerSettings";

export function SettingsManagement() {
  const { community, role } = useOwnerConsole();
  const searchParams = useSearchParams();
  const canView =
    hasCapability(role, "settings.view") ||
    hasCapability(role, "settings.manage");
  const canManage = hasCapability(role, "settings.manage");
  const canSecurity =
    hasCapability(role, "security.manage") || canManage;
  const isOwner = role === "owner";

  const {
    settings,
    loading,
    saving,
    error,
    section,
    setSection,
    save,
    danger,
    exportData,
  } = useOwnerSettings(community?.id ?? null);

  const formTopRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  /** Open a section: show it right away (no scrolling down past the menu) and keep it in the URL. */
  const openSection = useCallback(
    (id: SettingsSectionId) => {
      setSection(id);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", id);
        window.history.replaceState(window.history.state, "", url.toString());
      } catch {
        /* URL update is a convenience only */
      }
      requestAnimationFrame(() => {
        formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [setSection],
  );

  // Keep the active tab visible in the mobile tab bar.
  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>(`[data-section="${section}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [section]);

  useEffect(() => {
    const tab = searchParams.get("tab")?.trim() as SettingsSectionId | undefined;
    if (tab && (SETTINGS_SECTIONS as readonly string[]).includes(tab)) {
      setSection(tab);
    }
  }, [searchParams, setSection]);

  if (!community) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Select a community to manage settings.
      </p>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Settings require staff access
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Your current role ({role}) does not include settings.view.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-5">
      {/* Mobile / tablet: sticky tab bar — tapping a tab shows that section directly below. */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-[var(--color-border)] bg-[#F8FAFC]/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Settings categories"
          className="flex gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-hide"
        >
          {SETTINGS_SECTIONS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              data-section={id}
              aria-selected={section === id}
              onClick={() => openSection(id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                section === id
                  ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                  : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
              }`}
            >
              {SETTINGS_SECTION_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {/* Laptop: sidebar with short descriptions. */}
      <nav
        aria-label="Settings categories"
        className="sticky top-4 hidden h-fit max-h-[calc(100dvh-8rem)] space-y-0.5 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 lg:block"
      >
        {SETTINGS_SECTIONS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => openSection(id)}
            aria-current={section === id ? "page" : undefined}
            className={`flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors ${
              section === id
                ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <span className="text-[12px] font-semibold">
              {SETTINGS_SECTION_LABELS[id]}
            </span>
            <span
              className={`mt-0.5 text-[10px] leading-snug ${
                section === id ? "opacity-80" : "opacity-70"
              }`}
            >
              {SETTINGS_SECTION_DESCRIPTIONS[id]}
            </span>
          </button>
        ))}
      </nav>

      <div ref={formTopRef} className="min-w-0 scroll-mt-16 space-y-4 lg:scroll-mt-4">
        <p className="text-[12px] text-[var(--color-text-muted)] lg:hidden">
          {SETTINGS_SECTION_DESCRIPTIONS[section as SettingsSectionId]}
        </p>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {loading || !settings ? (
          <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Loading settings…
          </p>
        ) : (
          <SettingsSectionForm
            key={`${settings.communityId}-${section}`}
            section={section as SettingsSectionId}
            settings={settings}
            canManage={canManage}
            canSecurity={canSecurity}
            isOwner={isOwner}
            saving={saving}
            onSave={save}
            onDanger={danger}
            onExport={() => void exportData()}
          />
        )}
      </div>
    </div>
  );
}
