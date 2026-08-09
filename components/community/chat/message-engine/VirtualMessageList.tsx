"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format, isSameDay } from "date-fns";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Msg } from "@/types";

type DayItem = { kind: "day"; id: string; day: Date };
type SystemItem = { kind: "system"; id: string; msg: Msg };
type MessageItem = { kind: "message"; id: string; msg: Msg; compact: boolean };
export type VirtualListItem = DayItem | SystemItem | MessageItem;

export function buildMessageListItems(messages: Msg[]): VirtualListItem[] {
  const items: VirtualListItem[] = [];
  let lastDay: Date | null = null;
  let lastSender: string | null = null;
  for (const m of messages) {
    const d = new Date(m.created_at);
    if (!lastDay || !isSameDay(lastDay, d)) {
      items.push({ kind: "day", id: `day-${d.toISOString()}`, day: d });
      lastDay = d;
      lastSender = null;
    }
    if (m.message_type === "system") {
      items.push({ kind: "system", id: m.id, msg: m });
      lastSender = null;
    } else {
      const compact = lastSender === m.sender_id;
      items.push({ kind: "message", id: m.id, msg: m, compact });
      lastSender = m.sender_id;
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
  hasMore,
  loadingOlder,
  onLoadOlder,
}: {
  messages: Msg[];
  scrollRef: RefObject<HTMLDivElement | null>;
  renderMessage: (msg: Msg, meta: { compact: boolean }) => ReactNode;
  footer?: ReactNode;
  className?: string;
  hasMore?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => Promise<{ added: number; anchorId: string | null } | void>;
}) {
  const items = useMemo(() => buildMessageListItems(messages), [messages]);
  const parentRef = scrollRef;
  const stickBottomRef = useRef(true);
  const loadingOlderGuard = useRef(false);
  const preserveAnchorRef = useRef<{ id: string; top: number } | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = items[index];
      if (!item) return 72;
      if (item.kind === "day") return 28;
      if (item.kind === "system") return 24;
      return item.compact ? 56 : 88;
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

      if (
        el.scrollTop < 120 &&
        hasMore &&
        onLoadOlder &&
        !loadingOlder &&
        !loadingOlderGuard.current
      ) {
        loadingOlderGuard.current = true;
        const firstMsg = messages[0];
        if (firstMsg) {
          const row = el.querySelector(`[data-msg-id="${firstMsg.id}"]`) as HTMLElement | null;
          preserveAnchorRef.current = {
            id: firstMsg.id,
            top: row ? row.getBoundingClientRect().top : 0,
          };
        }
        void onLoadOlder()
          .then(() => {
            requestAnimationFrame(() => {
              const anchor = preserveAnchorRef.current;
              const scroller = parentRef.current;
              if (!anchor || !scroller) return;
              const row = scroller.querySelector(
                `[data-msg-id="${anchor.id}"]`
              ) as HTMLElement | null;
              if (!row) return;
              const delta = row.getBoundingClientRect().top - anchor.top;
              scroller.scrollTop += delta;
              preserveAnchorRef.current = null;
            });
          })
          .finally(() => {
            loadingOlderGuard.current = false;
          });
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [parentRef, hasMore, loadingOlder, onLoadOlder, messages]);

  useEffect(() => {
    if (!stickBottomRef.current || items.length === 0) return;
    if (loadingOlder || preserveAnchorRef.current) return;
    const last = items.length - 1;
    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(last, { align: "end" });
    });
  }, [items.length, virtualizer, items, loadingOlder]);

  const header = useCallback(() => {
    if (!hasMore && !loadingOlder) return null;
    return (
      <div className="flex justify-center py-3" role="status" aria-live="polite">
        {loadingOlder ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-muted)]" />
        ) : (
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Scroll up for earlier messages
          </span>
        )}
      </div>
    );
  }, [hasMore, loadingOlder]);

  return (
    <div className={cn("relative w-full", className)} style={{ height: "100%" }}>
      {header()}
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
              data-msg-id={item.kind === "message" || item.kind === "system" ? item.msg.id : item.id}
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
                <div className="my-1.5 mb-2 flex justify-center" role="separator">
                  <span
                    className={cn(
                      "rounded-full border border-white/70 px-2.5 py-0.5 text-[11px] font-medium shadow-sm",
                      "bg-white/90 text-gray-500 backdrop-blur-sm"
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
              {item.kind === "message" &&
                renderMessage(item.msg, { compact: item.compact })}
            </div>
          );
        })}
      </div>
      {footer}
    </div>
  );
}
