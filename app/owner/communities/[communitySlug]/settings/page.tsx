"use client";

import { Suspense } from "react";
import { OwnerSectionShell } from "@/components/community/owner-console";
import { SettingsManagement } from "@/components/community/owner-console/settings";

export default function OwnerConsoleSettingsPage() {
  return (
    <OwnerSectionShell sectionId="settings">
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Loading settings…
          </div>
        }
      >
        <SettingsManagement />
      </Suspense>
    </OwnerSectionShell>
  );
}
