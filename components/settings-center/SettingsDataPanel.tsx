"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { deactivateAccount, exportUserData } from "@/lib/actions/account-settings";
import { useSettingsCenter } from "./settings-center-context";
import {
  SettingsButton,
  SettingsCard,
  SettingsPageHeader,
  SettingsStatus,
} from "./settings-ui";

export function SettingsDataPanel() {
  const { menuButton } = useSettingsCenter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <SettingsPageHeader
        title="Data & Export"
        description="Download a copy of your Jimvio account data or deactivate the account."
        menuButton={menuButton}
      />

      <div className="space-y-5">
        <SettingsCard
          title="Export personal data"
          description="Creates a JSON file with your profile, roles, and recent orders. The download stays in this browser session."
        >
          <SettingsButton
            variant="secondary"
            loading={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await exportUserData();
                if (!result.success) {
                  setError(result.error || "Could not export data");
                  toast.error(result.error || "Could not export data");
                  return;
                }
                if (result.data?.json) {
                  const blob = new Blob([result.data.json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = "jimvio-account-export.json";
                  anchor.click();
                  URL.revokeObjectURL(url);
                }
                toast.success("Export ready");
              });
            }}
          >
            Download account export
          </SettingsButton>
        </SettingsCard>

        <SettingsCard
          title="Cookies"
          description="Jimvio documents cookie use on the legal cookie page. There is no separate in-app consent manager."
        >
          <Link
            href="/cookie-settings"
            className="inline-flex h-11 items-center rounded-xl border border-[#E5E7EB] px-4 text-[14px] font-semibold text-[#111827] hover:bg-[#F9FAFB]"
          >
            Open cookie settings
          </Link>
        </SettingsCard>

        <SettingsCard
          title="Deactivate account"
          description="This turns the profile inactive and disables non-admin roles. Support is required to restore access."
        >
          {!confirming ? (
            <SettingsButton variant="danger" onClick={() => setConfirming(true)}>
              Deactivate account
            </SettingsButton>
          ) : (
            <div className="space-y-3">
              <SettingsStatus tone="error">
                This cannot be undone from Settings. Confirm only if you want the account deactivated.
              </SettingsStatus>
              <div className="flex flex-wrap gap-2">
                <SettingsButton
                  variant="danger"
                  loading={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await deactivateAccount();
                      if (!result.success) {
                        setError(result.error || "Could not deactivate account");
                        toast.error(result.error || "Could not deactivate account");
                        return;
                      }
                      toast.success(result.data?.message || "Account deactivated");
                    });
                  }}
                >
                  Confirm deactivation
                </SettingsButton>
                <SettingsButton variant="secondary" onClick={() => setConfirming(false)}>
                  Cancel
                </SettingsButton>
              </div>
            </div>
          )}
        </SettingsCard>

        {error ? <SettingsStatus tone="error">{error}</SettingsStatus> : null}
      </div>
    </div>
  );
}
