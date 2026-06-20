"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardMessagePreview {
  id: string;
  name: string;
  preview: string;
  time: string;
  avatarUrl?: string | null;
  initials: string;
  color: string;
  href?: string;
}

function MessageAvatar({
  name,
  avatarUrl,
  initials,
  color,
}: {
  name: string;
  avatarUrl?: string | null;
  initials: string;
  color: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="size-9 shrink-0 rounded-full object-cover ring-1 ring-[var(--color-border)]"
      />
    );
  }
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-1 ring-[var(--color-border)]"
      style={{ background: color }}
    >
      {initials}
    </span>
  );
}

interface DashboardMessagesPanelProps {
  messages: DashboardMessagePreview[];
  className?: string;
}

export function DashboardMessagesPanel({ messages, className }: DashboardMessagesPanelProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-[13px] font-bold text-[var(--color-text-primary)]">My messages</h3>
        <Link
          href="/dashboard/messages"
          className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
        >
          Open inbox
        </Link>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {messages.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="mx-auto size-7 text-[var(--color-text-muted)]" />
            <p className="mt-2 text-[12px] font-medium text-[var(--color-text-secondary)]">
              No conversations yet
            </p>
            <Link
              href="/marketplace"
              className="mt-1 inline-block text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              Message a vendor →
            </Link>
          </div>
        ) : (
          messages.slice(0, 4).map((msg) => (
            <Link
              key={msg.id}
              href={msg.href ?? "/dashboard/messages"}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-secondary)]/60"
            >
              <MessageAvatar
                name={msg.name}
                avatarUrl={msg.avatarUrl}
                initials={msg.initials}
                color={msg.color}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                    {msg.name}
                  </p>
                  <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">
                    {msg.time}
                  </span>
                </div>
                <p className="truncate text-[11px] text-[var(--color-text-muted)]">{msg.preview}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
