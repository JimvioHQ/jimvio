"use client";

import { OwnerSectionShell } from "@/components/community/owner-console";
import { EventsManagement } from "@/components/community/owner-console/events";

export default function OwnerConsolePage() {
  return (
    <OwnerSectionShell sectionId="events">
      <EventsManagement />
    </OwnerSectionShell>
  );
}
