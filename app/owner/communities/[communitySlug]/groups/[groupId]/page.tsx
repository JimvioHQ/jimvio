"use client";

import { Suspense } from "react";
import { use } from "react";
import { GroupSettingsPage } from "@/components/community/owner-console/groups";

export default function OwnerGroupSettingsRoute({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          Loading group…
        </div>
      }
    >
      <GroupSettingsPage groupId={groupId} />
    </Suspense>
  );
}
