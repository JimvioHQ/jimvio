"use client";

import { Suspense, use } from "react";
import { ChannelSettingsPage } from "@/components/community/owner-console/channels";

export default function OwnerChannelSettingsRoute({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          Loading channel…
        </div>
      }
    >
      <ChannelSettingsPage channelId={channelId} />
    </Suspense>
  );
}
