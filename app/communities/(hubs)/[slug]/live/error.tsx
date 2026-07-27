"use client";

import { LiveStudioErrorView } from "@/components/community/hub/live/LiveStudioErrorView";

export default function CommunityLiveStudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <LiveStudioErrorView error={error} reset={reset} />;
}
