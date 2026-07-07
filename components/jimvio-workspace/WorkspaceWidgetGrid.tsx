"use client";

import { memo, useCallback, useEffect, useState } from "react";
import type { JimvioWorkspaceData } from "@/lib/jimvio-workspace/types";
import { useWorkspaceStore } from "@/lib/store/use-workspace-store";
import { WorkspaceWidgetShell, WorkspaceWidgetSkeleton } from "./WorkspaceWidgetShell";
import { WorkspaceWidgetContent } from "./WorkspaceWidgetContent";
import { useLazyWidget } from "./use-lazy-widget";

type WorkspaceWidgetGridProps = {
  data: JimvioWorkspaceData;
  loading?: boolean;
};

function LazyWidget({
  layout,
  data,
  editMode,
  dragSourceId,
  onDragSource,
  onDropTarget,
}: {
  layout: ReturnType<typeof useWorkspaceStore.getState>["layout"][number];
  data: JimvioWorkspaceData;
  editMode: boolean;
  dragSourceId: string | null;
  onDragSource: (id: string) => void;
  onDropTarget: (id: string) => void;
}) {
  const { ref, visible } = useLazyWidget();
  const toggleHidden = useWorkspaceStore((s) => s.toggleHidden);
  const togglePinned = useWorkspaceStore((s) => s.togglePinned);
  const resizeWidget = useWorkspaceStore((s) => s.resizeWidget);
  const reorderWidget = useWorkspaceStore((s) => s.reorderWidget);

  if (layout.hidden && !editMode) return null;

  return (
    <div ref={ref} className="contents">
      {visible ? (
        <WorkspaceWidgetShell
          layout={layout}
          editMode={editMode}
          onToggleHidden={() => toggleHidden(layout.instanceId)}
          onTogglePinned={() => togglePinned(layout.instanceId)}
          onResize={(size) => resizeWidget(layout.instanceId, size)}
          onReorder={(dir) => reorderWidget(layout.instanceId, dir)}
          onDragStart={() => onDragSource(layout.instanceId)}
          onDragOver={() => {}}
          onDrop={() => {
            if (dragSourceId) onDropTarget(layout.instanceId);
          }}
        >
          <WorkspaceWidgetContent widgetId={layout.widgetId} data={data} />
        </WorkspaceWidgetShell>
      ) : (
        <WorkspaceWidgetSkeleton colSpan={layout.colSpan} />
      )}
    </div>
  );
}

export const WorkspaceWidgetGrid = memo(function WorkspaceWidgetGrid({
  data,
  loading = false,
}: WorkspaceWidgetGridProps) {
  const layout = useWorkspaceStore((s) => s.layout);
  const editMode = useWorkspaceStore((s) => s.editMode);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const moveWidget = useWorkspaceStore((s) => s.moveWidget);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const onDropTarget = useCallback(
    (targetId: string) => {
      if (dragSourceId) moveWidget(dragSourceId, targetId);
      setDragSourceId(null);
    },
    [dragSourceId, moveWidget],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-6 gap-3 md:grid-cols-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <WorkspaceWidgetSkeleton key={`ws-skel-${i}`} colSpan={i % 2 === 0 ? 3 : 6} />
        ))}
      </div>
    );
  }

  const visibleLayout = layout.filter((w) => !w.hidden || editMode);

  return (
    <div
      className="grid grid-cols-6 gap-3 md:grid-cols-12"
      role="list"
      aria-label="Workspace widgets"
    >
      {visibleLayout.map((item) => (
        <LazyWidget
          key={item.instanceId}
          layout={item}
          data={data}
          editMode={editMode}
          dragSourceId={dragSourceId}
          onDragSource={setDragSourceId}
          onDropTarget={onDropTarget}
        />
      ))}
    </div>
  );
});
