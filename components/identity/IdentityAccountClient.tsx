"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Save } from "lucide-react";
import {
  IdentityButton,
  IdentityCard,
} from "@/components/identity/identity-ui";
import {
  exportUserData,
  requestEmailChange,
  saveUserPreferences,
} from "@/lib/actions/account-settings";

export function IdentityAccountClient({
  email,
  language,
}: {
  email: string;
  language: string;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [prefLanguage, setPrefLanguage] = useState(language || "en");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
          Jimvio Identity
        </p>
        <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
          Account settings
        </h1>
        <p className="mt-1 text-[13.5px] text-[#8B8579]">
          Manage account email and preferences. Security controls live under Security.
        </p>
      </div>

      <div className="space-y-5">
        <IdentityCard className="space-y-3 p-5 sm:p-6">
          <p className="text-[13px] font-semibold text-[#1C1B19]">Account email</p>
          <p className="text-[13px] text-[#8B8579]">Current: {email || "—"}</p>
          <label className="block text-[12px] font-medium text-[#726D64]">
            Request email change
            <input
              className="mt-1.5 h-11 w-full rounded-xl border border-black/[0.08] px-3.5 text-[14px] outline-none focus:border-[#FF5A1F]/50"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
            />
          </label>
          <IdentityButton
            loading={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await requestEmailChange(newEmail);
                if (!result.success) {
                  toast.error(result.error || "Could not request email change");
                  return;
                }
                toast.success(result.data?.message || "Check your inbox to confirm the email change");
                setNewEmail("");
              });
            }}
          >
            <Save className="h-4 w-4" /> Request change
          </IdentityButton>
        </IdentityCard>

        <IdentityCard className="space-y-3 p-5 sm:p-6">
          <p className="text-[13px] font-semibold text-[#1C1B19]">Preferences</p>
          <label className="block text-[12px] font-medium text-[#726D64]">
            Preferred language
            <select
              className="mt-1.5 h-11 w-full rounded-xl border border-black/[0.08] px-3.5 text-[14px]"
              value={prefLanguage}
              onChange={(e) => setPrefLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="rw">Kinyarwanda</option>
              <option value="sw">Swahili</option>
            </select>
          </label>
          <IdentityButton
            loading={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await saveUserPreferences({
                  language: prefLanguage,
                  timezone: "UTC",
                  preferred_currency: "USD",
                });
                if (!result.success) {
                  toast.error(result.error || "Could not save preferences");
                  return;
                }
                toast.success("Preferences saved");
              });
            }}
          >
            <Save className="h-4 w-4" /> Save preferences
          </IdentityButton>
        </IdentityCard>

        <IdentityCard className="space-y-3 p-5 sm:p-6">
          <p className="text-[13px] font-semibold text-[#1C1B19]">Data export</p>
          <p className="text-[12.5px] text-[#8B8579]">
            Download a copy of your Jimvio account data.
          </p>
          <IdentityButton
            variant="outline"
            loading={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await exportUserData();
                if (!result.success) {
                  toast.error(result.error || "Could not export data");
                  return;
                }
                toast.success("Export ready");
                if (result.data?.json) {
                  const blob = new Blob([result.data.json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "jimvio-account-export.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }
              });
            }}
          >
            Request data export
          </IdentityButton>
        </IdentityCard>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/identity/security"
            className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-[13px] font-semibold"
          >
            Security
          </Link>
          <Link
            href="/identity/settings"
            className="inline-flex h-10 items-center rounded-full px-3 text-[13px] font-semibold text-[#D6480F]"
          >
            Back to settings
          </Link>
        </div>
      </div>
    </div>
  );
}
