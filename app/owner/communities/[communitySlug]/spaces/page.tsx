"use client";

import { Suspense } from "react";
import { OwnerSectionShell } from "@/components/community/owner-console";
import { GroupsManagement } from "@/components/community/owner-console/groups";

export default function OwnerConsoleSpacesPage() {
  return (
    <OwnerSectionShell sectionId="spaces">
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Loading spaces…
          </div>
        }
      >
        <GroupsManagement />
      </Suspense>
    </OwnerSectionShell>
  );
}
