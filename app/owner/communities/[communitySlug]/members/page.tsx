"use client";

import { Suspense } from "react";
import { OwnerSectionShell } from "@/components/community/owner-console";
import { MembersManagement } from "@/components/community/owner-console/members";

export default function OwnerConsoleMembersPage() {
  return (
    <OwnerSectionShell sectionId="members">
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Loading members…
          </div>
        }
      >
        <MembersManagement />
      </Suspense>
    </OwnerSectionShell>
  );
}
