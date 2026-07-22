"use client";

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { Msg } from "@/types";

type DayItem = { kind: "day"; id: string; day: Date };
type SystemItem = { kind: "system"; id: string; msg: Msg };
type MessageItem = { kind: "message"; id: string; msg: Msg };
export type VirtualListItem = DayItem | SystemItem | MessageItem;

export function buildMessageListItems(messages: Msg[]): VirtualListItem[] {
  const items: VirtualListItem[] = [];
  let lastDay: Date | null = null;
  for (const m of messages) {
    const d = new Date(m.created_at);
    if (!lastDay || !isSameDay(lastDay, d)) {
      items.push({ kind: "day", id: `day-${d.toISOString()}`, day: d });
      lastDay = d;
    }
    if (m.message_type === "system") {
      items.push({ kind: "system", id: m.id, msg: m });
    } else {
      items.push({ kind: "message", id: m.id, msg: m });
    }
  }
  return items;
}

export function VirtualMessageList({
  messages,
  scrollRef,
  renderMessage,
  footer,
  className,
}: {
  messages: Msg[];
  scrollRef: RefObject<HTMLDivElement | null>;
  renderMessage: (msg: Msg) => ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const items = useMemo(() => buildMessageListItems(messages), [messages]);
  const parentRef = scrollRef;
  const stickBottomRef = useRef(true);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = items[index];
      if (!item) return 72;
      if (item.kind === "day") return 44;
      if (item.kind === "system") return 28;
      return 96;
    },
    overscan: 8,
    getItemKey: (index) => items[index]?.id ?? index,
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickBottomRef.current = dist < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [parentRef]);

  useEffect(() => {
    if (!stickBottomRef.current || items.length === 0) return;
    const last = items.length - 1;
    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(last, { align: "end" });
    });
  }, [items.length, virtualizer, items]);

  return (
    <div className={cn("relative w-full", className)} style={{ height: "100%" }}>
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vRow) => {
          const item = items[vRow.index];
          if (!item) return null;
          return (
            <div
              key={item.id}
              data-index={vRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              {item.kind === "day" && (
                <div className="my-2 mb-4 flex justify-center">
                  <span
                    className={cn(
                      "rounded-md border border-[var(--color-border)] px-3 py-[5px] text-[12px] font-medium shadow-sm",
                      "bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                    )}
                  >
                    {format(item.day, "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {item.kind === "system" && (
                <p className="py-1 text-center text-xs text-[var(--color-text-muted)]">
                  {item.msg.body}
                </p>
              )}
              {item.kind === "message" && renderMessage(item.msg)}
            </div>
          );
        })}
      </div>
      {footer}
    </div>
  );
}
