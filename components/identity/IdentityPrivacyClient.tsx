"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, Save } from "lucide-react";
import type { IdentityPrivacyVisibility } from "@/lib/identity/types";
import {
  IdentityButton,
  IdentityCard,
  cn,
} from "@/components/identity/identity-ui";

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
};

export function IdentityPrivacyClient({
  initialVisibility,
  initialCustom,
}: {
  initialVisibility: IdentityPrivacyVisibility;
  initialCustom: Record<string, unknown>;
}) {
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
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
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
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
          Jimvio Identity
        </p>
        <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
          Privacy & visibility
        </h1>
        <p className="mt-1 text-[13.5px] text-[#8B8579]">
          Choose who can view your professional identity. Wallet, payouts, and KYC data stay
          private.
        </p>
      </div>

      <div className="space-y-5">
        <IdentityCard className="p-5 sm:p-6">
          <p className="mb-1 text-[13px] font-semibold text-[#1C1B19]">Public profile</p>
          <p className="mb-4 text-[12.5px] text-[#8B8579]">
            Choose who can view your professional identity. Resume, media kit and analytics remain private until you enable them below.
          </p>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map((opt) => {
              const active = privacyVisibility === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrivacyVisibility(opt.value)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                    active ? "border-[#FF5A1F] bg-[#FFF6F1]" : "border-black/[0.06] hover:border-black/15",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      active ? "border-[#FF5A1F] bg-[#FF5A1F]" : "border-black/20",
                    )}
                  >
                    {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[#1C1B19]">{opt.label}</p>
                    <p className="text-[12px] text-[#8B8579]">{opt.description}</p>
                  </div>
                  {opt.value === "private" ? (
                    <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[#B9B3A6]" />
                  ) : (
                    <Eye className="mt-0.5 h-4 w-4 shrink-0 text-[#B9B3A6]" />
                  )}
                </button>
              );
            })}
          </div>
        </IdentityCard>

        <IdentityCard className="p-5 sm:p-6">
          <p className="mb-1 text-[13px] font-semibold text-[#1C1B19]">Visible details</p>
          <p className="mb-4 text-[12.5px] text-[#8B8579]">
            When your profile is visible, choose which sections appear publicly.
          </p>
          <div className="space-y-2">
            {(
              [
                ["showBio", "Bio"],
                ["showLocation", "Location"],
                ["showWebsite", "Website"],
                ["showSkills", "Skills & languages"],
                ["showSocial", "External links"],
                ["showResume", "Resume and work history"],
                ["showMediaKit", "Media kit"],
                ["showAnalytics", "Analytics"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] px-3.5 py-3"
              >
                <span className="text-[13px] font-medium text-[#1C1B19]">{label}</span>
                <input
                  type="checkbox"
                  checked={fields[key]}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, [key]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-black/20 text-[#FF5A1F] focus:ring-[#FF5A1F]/30"
                />
              </label>
            ))}
          </div>
        </IdentityCard>

        <div className="flex flex-wrap gap-2">
          <IdentityButton onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> Save privacy settings
          </IdentityButton>
          <Link
            href="/identity/settings"
            className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-[13px] font-semibold"
          >
            Back to settings
          </Link>
        </div>
      </div>
    </div>
  );
}
