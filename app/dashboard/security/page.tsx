import Link from "next/link";
import { Suspense } from "react";
import { Loader2, Shield, Settings } from "lucide-react";
import { check2FAStatus, getSessions } from "@/lib/actions/security";
import { SecurityForm } from "@/components/security/security-form";
import { AccountSettingsHeader } from "@/components/dashboard/account-settings-header";

export const metadata = {
  title: "Security · Dashboard",
  description:
    "Password, two-factor authentication, and active sessions for your account.",
};

export const dynamic = "force-dynamic";

export default async function DashboardSecurityPage() {
  const [status, sessions] = await Promise.allSettled([
    check2FAStatus(),
    getSessions(),
  ]);

  const initialTwoFa =
    status.status === "fulfilled" ? status.value : { enabled: false };
  const initialSessions =
    sessions.status === "fulfilled" ? sessions.value : [];
  const sessionsError =
    sessions.status === "rejected"
      ? (sessions.reason as Error)?.message ?? "Could not load sessions"
      : undefined;

  if (sessions.status === "rejected") {
    console.error("[dashboard/security] getSessions failed:", sessions.reason);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
        <AccountSettingsHeader
          title="Security"
          description="Manage your password, authenticator app, and signed-in devices."
        />

        <div className="flex items-center border-t border-[var(--color-border)]/60 px-4 py-2 sm:px-5">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] transition-all hover:text-[var(--color-text-primary)] hover:ring-[var(--color-border-strong)]"
          >
            <Settings className="size-4" />
            Account settings
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-lg"
            style={{ background: "var(--color-accent-light)" }}
          >
            <Shield className="size-4" style={{ color: "var(--color-accent)" }} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Account security
            </h2>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              Password, two-factor authentication, and sessions
            </p>
          </div>
        </div>

        <Suspense fallback={<PageLoader />}>
          <SecurityForm
            initialTwoFa={initialTwoFa}
            initialSessions={initialSessions}
            sessionsError={sessionsError}
          />
        </Suspense>
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="size-6 animate-spin text-[var(--color-text-muted)]" />
    </div>
  );
}
