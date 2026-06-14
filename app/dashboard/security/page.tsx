import Link from "next/link";
import { Suspense } from "react";
import { Loader2, Shield, Settings } from "lucide-react";
import { check2FAStatus, getSessions } from "@/lib/actions/security";
import { SecurityForm } from "@/components/security/security-form";

export const metadata = {
  title: "Security · Dashboard",
  description: "Password, two-factor authentication, and active sessions for your account.",
};

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
    <div className="min-h-screen pb-24 bg-[var(--color-bg)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[var(--color-accent-light)]">
                <Shield className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                Account
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Security
            </h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)] max-w-xl">
              Manage your password, authenticator app, and devices signed in to your account.
            </p>
          </div>

          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] text-[var(--color-text-primary)] shrink-0"
          >
            <Settings className="h-4 w-4" />
            Account settings
          </Link>
        </div>

        <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4 sm:p-6">
          <Suspense fallback={<PageLoader />}>
            <SecurityForm
              initialTwoFa={initialTwoFa}
              initialSessions={initialSessions}
              sessionsError={sessionsError}
            />
          </Suspense>
        </div>
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
