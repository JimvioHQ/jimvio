"use client";

import { usePathname } from "next/navigation";
import { CommunitySidebar } from "@/components/shell/CommunitySidebar";
import { useWorkspace } from "@/components/community/workspace-context";

/**
 * Member workspace chrome: Community sidebar only (no hub nav).
 * Desktop renders the sidebar; mobile uses HubLayout drawer.
 * Never mount on Manage Community routes (OwnerConsole owns that shell).
 */
export function CommunityWorkspaceFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { slug, communityName, overview } = useWorkspace();
  const isManage = /\/communities\/[^/]+\/manage(?:\/|$)/.test(pathname);

  if (isManage) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 bg-[var(--color-bg,#f4f4f5)]">
      <div className="hidden h-full shrink-0 lg:flex">
        <CommunitySidebar
          slug={slug}
          communityName={communityName}
          membersOnline={overview?.membersOnline}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
