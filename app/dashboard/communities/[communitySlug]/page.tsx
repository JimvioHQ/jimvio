"use client";

import { buildOwnerDashboardMetrics } from "@/lib/community/owner-console";
import {
  OwnerDashboardShell,
  useOwnerConsole,
} from "@/components/community/owner-console";

export default function OwnerConsoleOverviewPage() {
  const { community, communities, badges } = useOwnerConsole();
  const metrics = buildOwnerDashboardMetrics(community, {
    communitiesCount: communities.length,
    reports: badges.reports,
    live: badges.live,
  });

  return <OwnerDashboardShell metrics={metrics} />;
}
