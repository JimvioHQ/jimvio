"use client";

import { SecurityForm } from "@/components/security/security-form";
import type { Session } from "@/lib/actions/security";
import type { AuthMethods } from "@/lib/auth/actions";
import { useSettingsCenter } from "./settings-center-context";
import { SettingsCard, SettingsPageHeader } from "./settings-ui";

export function SettingsSecurityPanel({
  initialTwoFa,
  initialSessions,
  sessionsError,
  initialMethods,
}: {
  initialTwoFa: { enabled: boolean };
  initialSessions: Session[];
  sessionsError?: string;
  initialMethods: AuthMethods | null;
}) {
  const { menuButton } = useSettingsCenter();

  return (
    <div>
      <SettingsPageHeader
        title="Security"
        description="Password, two-factor authentication, and signed-in devices."
        menuButton={menuButton}
      />
      <SettingsCard>
        <SecurityForm
          initialTwoFa={initialTwoFa}
          initialSessions={initialSessions}
          sessionsError={sessionsError}
          initialMethods={initialMethods}
        />
      </SettingsCard>
    </div>
  );
}
