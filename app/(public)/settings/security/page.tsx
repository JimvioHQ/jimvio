import { check2FAStatus, getSessions } from "@/lib/actions/security";
import { getAuthMethods } from "@/lib/auth/actions";
import { SettingsSecurityPanel } from "@/components/settings-center/SettingsSecurityPanel";

export const metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function SettingsSecurityPage() {
  const [status, sessions, methods] = await Promise.allSettled([
    check2FAStatus(),
    getSessions(),
    getAuthMethods(),
  ]);

  return (
    <SettingsSecurityPanel
      initialTwoFa={status.status === "fulfilled" ? status.value : { enabled: false }}
      initialSessions={sessions.status === "fulfilled" ? sessions.value : []}
      sessionsError={
        sessions.status === "rejected"
          ? (sessions.reason as Error)?.message ?? "Could not load sessions"
          : undefined
      }
      initialMethods={methods.status === "fulfilled" ? methods.value : null}
    />
  );
}
