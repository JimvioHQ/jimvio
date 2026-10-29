"use client";

import { Suspense } from "react";
import { use } from "react";
import { GroupSettingsPage } from "@/components/community/owner-console/groups";

export default function OwnerSpaceSettingsRoute({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          Loading space…
        </div>
      }
    >
      <GroupSettingsPage groupId={spaceId} />
    </Suspense>
  );
}
