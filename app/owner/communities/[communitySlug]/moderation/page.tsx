"use client";

import { Suspense } from "react";
import { OwnerSectionShell } from "@/components/community/owner-console";
import { ModerationManagement } from "@/components/community/owner-console/moderation";

export default function OwnerConsoleModerationPage() {
  return (
    <OwnerSectionShell sectionId="moderation">
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Loading moderation…
          </div>
        }
      >
        <ModerationManagement />
      </Suspense>
    </OwnerSectionShell>
  );
}
