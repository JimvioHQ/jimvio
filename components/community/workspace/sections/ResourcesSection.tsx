"use client";

import { ResourceLibrary } from "@/components/community/os/ResourceLibrary";
import { useWorkspace } from "@/components/community/workspace-context";

export function ResourcesSection() {
  const { spacesWithRooms } = useWorkspace();
  const roomIds = spacesWithRooms.flatMap((s) => s.rooms.map((r) => r.id));

  return (
    <div className="mx-auto flex h-full min-h-[480px] max-w-4xl flex-col px-4 py-4 lg:px-6">
      <div className="mb-3">
        <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">
          Resource Library
        </h2>
        <p className="text-[12px] text-[var(--color-text-muted)]">
          PDFs · Videos · Images · Links · Templates · Downloads
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--color-border)]">
        <ResourceLibrary roomIds={roomIds} />
      </div>
    </div>
  );
}
