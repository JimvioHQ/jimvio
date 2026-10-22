"use client";

import { IdentityVerificationClient } from "@/components/identity/IdentityVerificationClient";
import { useSettingsCenter } from "./settings-center-context";
import { SettingsPageHeader } from "./settings-ui";

export function SettingsVerificationPanel({ initialVerified }: { initialVerified: boolean }) {
  const { menuButton } = useSettingsCenter();

  return (
    <div>
      <SettingsPageHeader
        title="Verification"
        description="Identity verification status comes from the verification provider. Jimvio does not mark you verified from this page alone."
        menuButton={menuButton}
      />
      <IdentityVerificationClient initialVerified={initialVerified} embedded />
    </div>
  );
}
