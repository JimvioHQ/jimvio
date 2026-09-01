"use client";

import { Suspense } from "react";
import { OwnerSectionShell } from "@/components/community/owner-console";
import { RolesManagement } from "@/components/community/owner-console/roles";

export default function OwnerConsoleRolesPage() {
  return (
    <OwnerSectionShell sectionId="roles">
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Loading roles…
          </div>
        }
      >
        <RolesManagement />
      </Suspense>
    </OwnerSectionShell>
  );
}
