"use client";

import { useState } from "react";
import { Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import type { IdentityPrivacyVisibility } from "@/lib/identity/types";
import type { PreciseLocationSummary } from "@/lib/geo/precise-location";
import { PreciseLocationCard } from "./PreciseLocationCard";
import { cn } from "@/lib/utils";
import { useSettingsCenter } from "./settings-center-context";
import { SettingsButton, SettingsCard, SettingsPageHeader, SettingsStatus } from "./settings-ui";

const VISIBILITY_OPTIONS: {
  value: IdentityPrivacyVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone on the internet can view your professional identity.",
  },
  {
    value: "followers_only",
    label: "Followers only",
    description: "Only people who follow you can view profile details.",
  },
  {
    value: "brand_only",
    label: "Brands only",
    description: "Visible to signed-in brand and business accounts.",
  },
  {
    value: "private",
    label: "Private",
    description: "Only you can view your full identity profile.",
  },
];

type FieldFlags = {
  showLocation: boolean;
  showWebsite: boolean;
  showBio: boolean;
  showSkills: boolean;
  showSocial: boolean;
  showResume: boolean;
  showMediaKit: boolean;
  showAnalytics: boolean;
  showPortfolio: boolean;
  showBusiness: boolean;
  showServices: boolean;
  showContact: boolean;
};

export function SettingsPrivacyForm({
  initialVisibility,
  initialCustom,
  preciseLocation,
}: {
  initialVisibility: IdentityPrivacyVisibility;
  initialCustom: Record<string, unknown>;
  preciseLocation: PreciseLocationSummary;
}) {
  const { menuButton } = useSettingsCenter();
  const [privacyVisibility, setPrivacyVisibility] =
    useState<IdentityPrivacyVisibility>(initialVisibility);
  const [fields, setFields] = useState<FieldFlags>({
    showLocation: initialCustom.showLocation !== false,
    showWebsite: initialCustom.showWebsite !== false,
    showBio: initialCustom.showBio !== false,
    showSkills: initialCustom.showSkills !== false,
    showSocial: initialCustom.showSocial !== false,
    showResume: initialCustom.showResume === true,
    showMediaKit: initialCustom.showMediaKit === true,
    showAnalytics: initialCustom.showAnalytics === true,
    showPortfolio: initialCustom.showPortfolio !== false,
    showBusiness: initialCustom.showBusiness !== false,
    showServices: initialCustom.showServices !== false,
    showContact: initialCustom.showContact !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/identity/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privacyVisibility,
          privacyCustom: fields,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save privacy settings");
      toast.success("Privacy settings saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SettingsPageHeader
        title="Privacy & Visibility"
        description="Choose who can view your professional identity. Wallet, payouts, and verification data stay private."
        menuButton={menuButton}
      />

      <div className="space-y-5">
        <SettingsCard title="Public profile" description="This controls the /u profile people can open. Resume, media kit and analytics remain private until you enable them below.">
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map((option) => {
              const active = privacyVisibility === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPrivacyVisibility(option.value)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                    active ? "border-[#FF5A1F] bg-[#FFF6F1]" : "border-[#E5E7EB] hover:border-[#D1D5DB]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                      active ? "border-[#FF5A1F] bg-[#FF5A1F]" : "border-[#D1D5DB]",
                    )}
                  >
                    {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[#111827]">{option.label}</span>
                    <span className="mt-0.5 block text-[13px] text-[#6B7280]">{option.description}</span>
                  </span>
                  {option.value === "private" ? (
                    <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[#D1D5DB]" />
                  ) : (
                    <Eye className="mt-0.5 h-4 w-4 shrink-0 text-[#D1D5DB]" />
                  )}
                </button>
              );
            })}
          </div>
        </SettingsCard>

        <SettingsCard
          title="Visible details"
          description="When your profile is visible, choose which sections appear publicly."
        >
          <div className="space-y-2">
            {(
              [
                ["showBio", "Bio"],
                ["showLocation", "Location"],
                ["showWebsite", "Website"],
                ["showSkills", "Skills and languages"],
                ["showSocial", "External links"],
                ["showResume", "Resume and work history"],
                ["showMediaKit", "Media kit"],
                ["showAnalytics", "Analytics"],
                ["showPortfolio", "Portfolio & Work"],
                ["showBusiness", "Business & Creator presence"],
                ["showServices", "Services & bookings"],
                ["showContact", "Contact preferences"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] px-3.5 py-3"
              >
                <span className="text-[14px] font-medium text-[#111827]">{label}</span>
                <input
                  type="checkbox"
                  checked={fields[key]}
                  onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.checked }))}
                  className="h-4 w-4 rounded border-[#D1D5DB] text-[#FF5A1F] focus:ring-[#FF5A1F]/30"
                />
              </label>
            ))}
          </div>
        </SettingsCard>

        {error ? <SettingsStatus tone="error">{error}</SettingsStatus> : null}

        <SettingsButton onClick={() => void save()} loading={saving}>
          <Save className="h-4 w-4" />
          Save privacy settings
        </SettingsButton>

        <PreciseLocationCard initial={preciseLocation} />
      </div>
    </div>
  );
}
