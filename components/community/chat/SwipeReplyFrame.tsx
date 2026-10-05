"use client";

import { useRef, useState, type ReactNode, type PointerEvent } from "react";
import { Reply } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD_PX = 56;
const MAX_DRAG_PX = 88;

/**
 * Horizontal swipe → Reply. Vertical scroll is preserved via axis lock.
 */
export function SwipeReplyFrame({
  enabled,
  onReply,
  children,
  className,
}: {
  enabled: boolean;
  onReply: () => void;
  children: ReactNode;
  className?: string;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"none" | "h" | "v">("none");
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // Desktop keeps Reply / context menu; swipe is touch/pen only.
    if (e.pointerType === "mouse") return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axis.current = "none";
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (axis.current === "none") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (axis.current === "v") return;
    }
    if (axis.current !== "h") return;
    // Allow swipe from either side toward center reply.
    const signed = Math.max(-MAX_DRAG_PX, Math.min(MAX_DRAG_PX, dx));
    setOffset(signed);
  }

  function finish(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const triggered = Math.abs(offset) >= THRESHOLD_PX && axis.current === "h";
    setDragging(false);
    setOffset(0);
    axis.current = "none";
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (triggered) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(12);
        } catch {
          /* ignore */
        }
      }
      onReply();
    }
  }

  const progress = Math.min(1, Math.abs(offset) / THRESHOLD_PX);

  return (
    <div
      className={cn("relative touch-pan-y", className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 flex items-center",
          offset >= 0 ? "left-2" : "right-2"
        )}
        aria-hidden
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5A1F]/15 text-[#FF5A1F] transition-opacity",
            progress > 0.15 ? "opacity-100" : "opacity-0"
          )}
          style={{ transform: `scale(${0.7 + progress * 0.35})` }}
        >
          <Reply className="h-4 w-4" />
        </span>
      </div>
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 160ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
