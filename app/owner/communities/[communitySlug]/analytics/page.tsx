"use client";

import { Suspense } from "react";
import { OwnerSectionShell } from "@/components/community/owner-console";
import { AnalyticsManagement } from "@/components/community/owner-console/analytics";

export default function OwnerConsoleAnalyticsPage() {
  return (
    <OwnerSectionShell sectionId="analytics">
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Loading analytics…
          </div>
        }
      >
        <AnalyticsManagement />
      </Suspense>
    </OwnerSectionShell>
  );
}
