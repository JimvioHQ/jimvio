"use client";

import { useEffect } from "react";
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
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav
        aria-label="Settings categories"
        className="h-fit space-y-0.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
      >
        {SETTINGS_SECTIONS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
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

      <div className="min-w-0 space-y-4">
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
