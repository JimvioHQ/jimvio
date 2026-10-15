"use client";

import { OwnerSectionShell } from "@/components/community/owner-console";
import { MissionsManagement } from "@/components/community/owner-console/missions/MissionsManagement";

export default function OwnerMissionsPage() {
  return (
    <OwnerSectionShell sectionId="missions">
      <MissionsManagement />
    </OwnerSectionShell>
  );
}
