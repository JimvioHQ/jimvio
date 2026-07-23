"use client";

import { buildOwnerDashboardMetrics } from "@/lib/community/owner-console";
import {
  OwnerDashboardShell,
  useOwnerConsole,
} from "@/components/community/owner-console";

export default function OwnerConsoleOverviewPage() {
  const { community } = useOwnerConsole();
  const metrics = buildOwnerDashboardMetrics(community);

  return <OwnerDashboardShell metrics={metrics} />;
}
