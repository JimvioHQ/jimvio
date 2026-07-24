"use client";

import { Suspense } from "react";
import { OwnerSectionShell } from "@/components/community/owner-console";
import { ChannelsManagement } from "@/components/community/owner-console/channels";

export default function OwnerConsoleChannelsPage() {
  return (
    <OwnerSectionShell sectionId="channels">
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            Loading channels…
          </div>
        }
      >
        <ChannelsManagement />
      </Suspense>
    </OwnerSectionShell>
  );
}
