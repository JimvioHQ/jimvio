"use client";

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { PageHeader } from "@/components/ui/admin";
import { AgentCenterView } from "@/components/jimvio-os/agents";

export default function AgentsPage() {
  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Jimvio Agent OS"
        title="Agent Center"
        subtitle="Your specialized AI coworkers — recommend only, you decide."
        border={false}
      />
      <AgentCenterView />
    </DashboardPage>
  );
}
