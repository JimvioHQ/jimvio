"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { AuthMethods } from "@/lib/auth/actions";
import { linkGoogleIdentity, unlinkAuthIdentity } from "@/lib/auth/actions";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import { useSettingsCenter } from "./settings-center-context";
import { SettingsButton, SettingsCard, SettingsPageHeader, SettingsStatus } from "./settings-ui";

export function SettingsConnectedPanel({
  methods,
  linkError,
}: {
  methods: AuthMethods | null;
  linkError?: string | null;
}) {
  const { menuButton } = useSettingsCenter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(linkError ?? null);

  return (
    <div>
      <SettingsPageHeader
        title="Connected Accounts"
        description="These are the sign-in methods and broadcast destinations actually attached to this account."
        menuButton={menuButton}
      />

      <div className="space-y-5">
        <SettingsCard title="Sign-in methods" description="Connect or remove providers without inventing a connected state.">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] px-4 py-3">
              <div>
                <p className="text-[14px] font-semibold text-[#111827]">Email and password</p>
                <p className="text-[13px] text-[#6B7280]">
                  {methods?.hasPassword
                    ? methods.email || "Password sign-in is enabled."
                    : "This account does not use email and password."}
                </p>
              </div>
              <span className="text-[12px] font-semibold text-[#6B7280]">
                {methods?.hasPassword ? "Available" : "Not set"}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] px-4 py-3">
              <div>
                <p className="text-[14px] font-semibold text-[#111827]">Google</p>
                <p className="text-[13px] text-[#6B7280]">
                  {methods?.googleConnected
                    ? "Google can be used to sign in to this account."
                    : "Google is not connected."}
                </p>
              </div>
              {methods?.googleConnected ? (
                <SettingsButton
                  variant="secondary"
                  loading={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await unlinkAuthIdentity("google");
                      if (result.error) {
                        setError(result.error);
                        toast.error(result.error);
                        return;
                      }
                      toast.success(result.success || "Google disconnected.");
                    });
                  }}
                >
                  Disconnect
                </SettingsButton>
              ) : (
                <SettingsButton
                  variant="secondary"
                  loading={pending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await linkGoogleIdentity();
                      } catch (err) {
                        if (isNextRedirectError(err)) throw err;
                        const message = err instanceof Error ? err.message : "Could not start Google connect";
                        setError(message);
                        toast.error(message);
                      }
                    });
                  }}
                >
                  Connect Google
                </SettingsButton>
              )}
            </div>
          </div>
          {error ? <div className="mt-4"><SettingsStatus tone="error">{error}</SettingsStatus></div> : null}
        </SettingsCard>

        <SettingsCard
          title="Live destinations"
          description="YouTube, Twitch, and other broadcast destinations are managed in Live settings so connection state stays accurate."
        >
          <p className="text-[13px] leading-relaxed text-[#6B7280]">
            Jimvio does not show a fake connected badge here. Open Live settings to connect or
            disconnect the destinations that are actually available on your account.
          </p>
          <Link
            href="/communities/live?open=settings"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-[14px] font-semibold text-[#111827] hover:bg-[#F9FAFB]"
          >
            Open live destinations
          </Link>
        </SettingsCard>
      </div>
    </div>
  );
}
