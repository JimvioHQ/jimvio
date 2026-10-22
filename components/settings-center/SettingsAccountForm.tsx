"use client";

import { useState, useTransition } from "react";
import { Mail, Save } from "lucide-react";
import { toast } from "sonner";
import { requestEmailChange } from "@/lib/actions/account-settings";
import { useSettingsCenter } from "./settings-center-context";
import {
  SettingsButton,
  SettingsCard,
  SettingsField,
  SettingsPageHeader,
  SettingsStatus,
  settingsInputClass,
} from "./settings-ui";

export function SettingsAccountForm({
  email,
  emailVerified,
  pendingEmail,
  hasPassword,
  userId,
}: {
  email: string;
  emailVerified: boolean;
  pendingEmail: string | null;
  hasPassword: boolean;
  userId: string;
}) {
  const { menuButton } = useSettingsCenter();
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <SettingsPageHeader
        title="Account"
        description="Manage the email you use to sign in and how this account is identified."
        menuButton={menuButton}
      />

      <div className="space-y-5">
        <SettingsCard
          title="Sign-in email"
          description="This address is used for login, recovery, and account notices."
          icon={<Mail className="h-4 w-4" />}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
              <p className="text-[13px] text-[#6B7280]">Current email</p>
              <p className="mt-0.5 text-[15px] font-semibold text-[#111827]">{email || "—"}</p>
              <p className="mt-1 text-[12.5px] text-[#6B7280]">
                {emailVerified ? "Email is verified." : "This email is not verified yet."}
              </p>
              {pendingEmail ? (
                <p className="mt-1 text-[12.5px] text-[#B54708]">
                  A change to {pendingEmail} is waiting for confirmation.
                </p>
              ) : null}
            </div>

            <SettingsField label="New email" htmlFor="settings-new-email">
              <input
                id="settings-new-email"
                className={settingsInputClass}
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="new@email.com"
                autoComplete="email"
              />
            </SettingsField>

            {hasPassword ? (
              <SettingsField
                label="Current password"
                htmlFor="settings-email-password"
                hint="Required to change email on a password account."
              >
                <input
                  id="settings-email-password"
                  className={settingsInputClass}
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </SettingsField>
            ) : (
              <p className="text-[13px] text-[#6B7280]">
                This account signs in with a connected provider. Confirm the new address from the
                email Jimvio sends.
              </p>
            )}

            {error ? <SettingsStatus tone="error">{error}</SettingsStatus> : null}

            <SettingsButton
              loading={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await requestEmailChange(newEmail, currentPassword || undefined);
                  if (!result.success) {
                    setError(result.error || "Could not request email change");
                    toast.error(result.error || "Could not request email change");
                    return;
                  }
                  toast.success(result.data?.message || "Check your inbox to confirm the new email.");
                  setNewEmail("");
                  setCurrentPassword("");
                });
              }}
            >
              <Save className="h-4 w-4" />
              Request email change
            </SettingsButton>
          </div>
        </SettingsCard>

        <SettingsCard title="Account identifier" description="Used internally and never shown as a public handle.">
          <p className="font-mono text-[13px] text-[#6B7280]">{userId}</p>
        </SettingsCard>
      </div>
    </div>
  );
}
