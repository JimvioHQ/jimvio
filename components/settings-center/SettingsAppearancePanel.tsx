"use client";

import { useSettingsCenter } from "./settings-center-context";
import { SettingsCard, SettingsPageHeader, SettingsStatus } from "./settings-ui";

export function SettingsAppearancePanel() {
  const { menuButton } = useSettingsCenter();

  return (
    <div>
      <SettingsPageHeader
        title="Appearance"
        description="Jimvio currently uses a light appearance across the product."
        menuButton={menuButton}
      />

      <SettingsCard title="Theme" description="Dark and system appearance are not enabled in this product yet.">
        <div className="rounded-2xl border border-[#FF5A1F] bg-[#FFF6F1] px-4 py-4">
          <p className="text-[14px] font-semibold text-[#111827]">Light</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
            The interface stays light so contrast, marketplace cards, and seller tools remain
            consistent. A dark or system option will appear here only when the product supports it.
          </p>
        </div>
        <div className="mt-4">
          <SettingsStatus tone="info">
            This is the active product appearance. It is not a local-only toggle.
          </SettingsStatus>
        </div>
      </SettingsCard>
    </div>
  );
}
