"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { scaledPreviewBox } from "@/lib/commerce-os/builder/preview-viewport";

export function PreviewStage({
  frameWidth,
  zoomPercent,
  selectedId,
  onStageWidth,
  onBackgroundClick,
  children,
}: {
  frameWidth: number;
  zoomPercent: number;
  selectedId?: string | null;
  onStageWidth?: (width: number) => void;
  onBackgroundClick?: () => void;
  children: ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(800);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      onStageWidth?.(stage.clientWidth);
    });
    ro.observe(stage);
    onStageWidth?.(stage.clientWidth);
    return () => ro.disconnect();
  }, [onStageWidth]);

  useEffect(() => {
    const node = innerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setContentHeight(node.scrollHeight || node.offsetHeight || 800);
    });
    ro.observe(node);
    setContentHeight(node.scrollHeight || node.offsetHeight || 800);
    return () => ro.disconnect();
  }, [frameWidth, zoomPercent, children]);

  useEffect(() => {
    if (!selectedId) return;
    const el = innerRef.current?.querySelector(
      `[data-section-id="${selectedId.replace(/"/g, "")}"]`
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const box = scaledPreviewBox(frameWidth, contentHeight, zoomPercent);

  return (
    <div
      ref={stageRef}
      className="min-h-0 min-w-0 flex-1 overflow-auto bg-[#E8EAED]"
      data-builder-stage="1"
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackgroundClick?.();
      }}
    >
      <div
        className="flex min-h-full justify-center px-3 py-4 sm:px-6 sm:py-6"
        data-builder-stage-pad="1"
        onClick={(e) => {
          if (e.target === e.currentTarget) onBackgroundClick?.();
        }}
      >
        <div
          className="relative shrink-0"
          style={{ width: box.width, height: box.height }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={innerRef}
            className="origin-top-left overflow-x-clip rounded-xl border border-[#9CA3AF]/50 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
            data-preview-frame="1"
            style={{
              width: frameWidth,
              transform: `scale(${box.scale})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
