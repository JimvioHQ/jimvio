"use client";

import { Suspense, useMemo, type ComponentType } from "react";
import { notFound } from "next/navigation";
import { OwnerSectionShell } from "@/components/community/owner-console";
import { SettingsManagement } from "@/components/community/owner-console/settings";
import { MembersManagement } from "@/components/community/owner-console/members";
import { RolesManagement } from "@/components/community/owner-console/roles";
import { ModerationManagement } from "@/components/community/owner-console/moderation";
import { GroupsManagement } from "@/components/community/owner-console/groups";
import { GroupSettingsPage } from "@/components/community/owner-console/groups/GroupSettingsPage";
import { AnalyticsManagement } from "@/components/community/owner-console/analytics";
import { EventsManagement } from "@/components/community/owner-console/events";
import { CoursesManagement } from "@/components/community/owner-console/courses/CoursesManagement";
import type { OwnerConsoleSectionId } from "@/lib/community/owner-console";

const TOP_LEVEL: Partial<Record<OwnerConsoleSectionId, ComponentType<object> | null>> = {
  settings: SettingsManagement,
  members: MembersManagement,
  roles: RolesManagement,
  moderation: ModerationManagement,
  spaces: GroupsManagement,
  analytics: AnalyticsManagement,
  events: EventsManagement,
  courses: CoursesManagement,
};

function SectionFallback({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
      Loading {label}…
    </div>
  );
}

export function ManageCommunitySectionView({
  sectionPath,
}: {
  sectionPath: string;
}) {
  const normalized = sectionPath.replace(/^\/+/, "").replace(/\/+$/, "");

  const nestedGroup = useMemo(() => {
    const m = normalized.match(/^(?:spaces|groups)\/([^/]+)$/);
    return m?.[1] ?? null;
  }, [normalized]);

  const topSegment = normalized.split("/")[0] ?? "";

  if (nestedGroup) {
    return (
      <Suspense fallback={<SectionFallback label="space" />}>
        <GroupSettingsPage groupId={nestedGroup} />
      </Suspense>
    );
  }

  const sectionId = (
    topSegment === "groups" || topSegment === "channels" ? "spaces" : topSegment
  ) as OwnerConsoleSectionId;

  const knownSections = new Set<OwnerConsoleSectionId>([
    "settings",
    "members",
    "roles",
    "moderation",
    "spaces",
    "content",
    "courses",
    "events",
    "live",
    "commerce",
    "analytics",
    "ai",
    "automations",
    "security",
    "integrations",
    "audit",
  ]);

  if (!sectionId || !knownSections.has(sectionId)) {
    notFound();
  }

  const Body = TOP_LEVEL[sectionId];

  return (
    <OwnerSectionShell sectionId={sectionId}>
      {Body ? (
        <Suspense fallback={<SectionFallback label={sectionId} />}>
          <Body />
        </Suspense>
      ) : null}
    </OwnerSectionShell>
  );
}
