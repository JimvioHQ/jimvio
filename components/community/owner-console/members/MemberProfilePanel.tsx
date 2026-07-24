"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MEMBER_ASSIGNABLE_ROLES,
  MEMBER_PROFILE_TABS,
  MEMBER_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
  type MemberProfileTab,
  type OwnerMemberDetail,
} from "@/lib/community/owner-console/members";
import { useState } from "react";

export function MemberProfilePanel({
  member,
  communitySlug,
  onClose,
  onAction,
}: {
  member: OwnerMemberDetail;
  communitySlug: string;
  onClose: () => void;
  onAction: (
    id: string,
    action: string,
    extra?: Record<string, unknown>
  ) => void;
}) {
  const [tab, setTab] = useState<MemberProfileTab>("overview");
  const [note, setNote] = useState("");
  const [role, setRole] = useState(String(member.role));

  return (
    <aside
      className="flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
      role="dialog"
      aria-label={`${member.displayName} profile`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
            {member.avatarUrl ? (
              <Image
                src={member.avatarUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-bold">
                {member.displayName[0]}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[var(--color-text-primary)]">
              {member.displayName}
            </p>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              {member.username ? `@${member.username}` : "—"} ·{" "}
              {MEMBER_ROLE_LABELS[String(member.role)] ?? member.role}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-2 py-2">
        {MEMBER_PROFILE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold capitalize",
              tab === t
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "overview" && (
          <div className="space-y-4 text-[13px]">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Status" value={MEMBER_STATUS_LABELS[member.status]} />
              <Stat label="Plan" value={member.planType ?? "—"} />
              <Stat label="Contribution" value={String(member.contributionScore)} />
              <Stat label="Creator score" value={String(member.creatorScore)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {member.badges.map((b) => (
                <span
                  key={b.id}
                  className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-semibold"
                >
                  {b.label}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/communities/${communitySlug}/members`}>
                  View in community
                </Link>
              </Button>
            </div>
          </div>
        )}

        {tab === "communities" && (
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Member of {member.communitiesCount} community workspace
            {member.communitiesCount === 1 ? "" : "s"} on Jimvio.
          </p>
        )}

        {tab === "groups" && (
          <ul className="space-y-2 text-[13px]">
            {member.groupNames.length === 0 ? (
              <li className="text-[var(--color-text-muted)]">No groups assigned</li>
            ) : (
              member.groupNames.map((g) => (
                <li
                  key={g}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2"
                >
                  {g}
                </li>
              ))
            )}
          </ul>
        )}

        {tab === "channels" && (
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Channel access is inherited from groups and room permissions. Active
            channel count: {member.channelCount}.
          </p>
        )}

        {tab === "notes" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a private staff note…"
                aria-label="Member note"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!note.trim()) return;
                  onAction(member.id, "add_note", { note: note.trim() });
                  setNote("");
                }}
              >
                Save
              </Button>
            </div>
            <ul className="space-y-2">
              {member.notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-[12px]"
                >
                  <p>{n.body}</p>
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                    {n.authorName ?? "Staff"} ·{" "}
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "moderation" && (
          <ul className="space-y-2">
            {member.moderationHistory.length === 0 ? (
              <li className="text-[13px] text-[var(--color-text-muted)]">
                No moderation history
              </li>
            ) : (
              member.moderationHistory.map((log) => (
                <li
                  key={log.id}
                  className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-[12px]"
                >
                  <p className="font-semibold capitalize">{log.action}</p>
                  {log.reason && (
                    <p className="text-[var(--color-text-muted)]">{log.reason}</p>
                  )}
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                    {log.moderatorName ?? "Staff"} ·{" "}
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        )}

        {(tab === "activity" ||
          tab === "knowledge" ||
          tab === "courses" ||
          tab === "commerce" ||
          tab === "warnings") && (
          <p className="text-[13px] text-[var(--color-text-muted)]">
            {tab[0]!.toUpperCase() + tab.slice(1)} insights reuse Community
            Workspace and Creator OS data in subsequent enrichment passes.
          </p>
        )}
      </div>

      <div className="space-y-3 border-t border-[var(--color-border)] p-4">
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9 flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-2 text-[12px]"
            aria-label="Change role"
          >
            {MEMBER_ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {MEMBER_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAction(member.id, "change_role", { role })
            }
          >
            Apply role
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(member.id, "mute")}
          >
            Mute
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(member.id, "timeout")}
          >
            Timeout
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(member.id, "suspend")}
          >
            Suspend
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(member.id, "ban")}
          >
            Ban
          </Button>
        </div>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}
