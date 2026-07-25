"use client";

import { format } from "date-fns";
import type { ReactNode } from "react";
import {
  Calendar,
  FileText,
  Lock,
  Shield,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DsDrawer } from "@/components/design-system/DsDrawer";
import {
  SPACE_TYPE_LABELS,
  type SpaceType,
  isSpaceType,
} from "@/lib/community/workspace/space-types";
import type { WorkspaceGroup } from "@/lib/community/workspace";
import { cn } from "@/lib/utils";

export type SpaceAboutMember = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role?: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function MemberChip({ member }: { member: SpaceAboutMember }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Avatar className="h-9 w-9 rounded-full ring-1 ring-[var(--color-border)]">
        {member.avatarUrl ? (
          <AvatarImage
            src={member.avatarUrl}
            alt=""
            className="rounded-full"
          />
        ) : null}
        <AvatarFallback className="rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-[11px] font-bold text-white">
          {initials(member.name)}
        </AvatarFallback>
      </Avatar>
      <span className="max-w-[64px] truncate text-[10px] text-[var(--color-text-muted)]">
        {member.name.split(" ")[0]}
      </span>
    </div>
  );
}

export function SpaceAboutPanel({
  open,
  onClose,
  group,
  spaceType,
  ownerName,
  createdAt,
  description,
  rules,
  members,
  onlineMembers = [],
  pinnedFiles = [],
  upcomingEvents = [],
}: {
  open: boolean;
  onClose: () => void;
  group: WorkspaceGroup;
  spaceType?: string | null;
  ownerName?: string | null;
  createdAt?: string | null;
  description?: string | null;
  rules?: string | null;
  members: SpaceAboutMember[];
  onlineMembers?: SpaceAboutMember[];
  pinnedFiles?: { id: string; name: string; href?: string }[];
  upcomingEvents?: { id: string; title: string; startsAt: string }[];
}) {
  const resolvedType: SpaceType = isSpaceType(spaceType)
    ? spaceType
    : "discussion";
  const typeLabel = SPACE_TYPE_LABELS[resolvedType];
  const about =
    description?.trim() ||
    group.description?.trim() ||
    `Welcome to ${group.name}. Join the conversation and collaborate with members.`;
  const visibility =
    group.privacy === "public"
      ? "Public"
      : group.privacy === "premium"
        ? "Premium"
        : "Private";

  return (
    <DsDrawer open={open} onClose={onClose} title="About this Space" side="right">
      <div className="space-y-7">
        <section>
          <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {about}
          </p>
        </section>

        {(rules || group.rules) && (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              <Shield className="h-3.5 w-3.5" aria-hidden />
              Rules
            </h3>
            <p className="whitespace-pre-wrap rounded-xl bg-[var(--color-bg)]/70 px-3.5 py-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]/60">
              {rules || group.rules}
            </p>
          </section>
        )}

        <section className="space-y-2.5 text-[13px]">
          <MetaRow
            label="Space type"
            value={
              <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-600">
                {typeLabel}
              </span>
            }
          />
          <MetaRow
            label="Created by"
            value={ownerName?.trim() || "Community owner"}
          />
          <MetaRow
            label="Created on"
            value={
              createdAt
                ? format(new Date(createdAt), "MMM d, yyyy")
                : "—"
            }
          />
          <MetaRow
            label="Visibility"
            value={
              <span className="inline-flex items-center gap-1">
                {group.privacy !== "public" ? (
                  <Lock className="h-3 w-3" aria-hidden />
                ) : null}
                {visibility}
              </span>
            }
          />
          <MetaRow
            label="Members"
            value={`${group.memberCount.toLocaleString()} members`}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Members ({members.length})
            </h3>
          </div>
          {members.length === 0 ? (
            <p className="text-[12px] text-[var(--color-text-muted)]">
              No members to show yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {members.slice(0, 12).map((m) => (
                <MemberChip key={m.id} member={m} />
              ))}
            </div>
          )}
        </section>

        {onlineMembers.length > 0 ? (
          <section>
            <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                aria-hidden
              />
              Online ({onlineMembers.length})
            </h3>
            <div className="flex flex-wrap gap-3">
              {onlineMembers.slice(0, 12).map((m) => (
                <MemberChip key={m.id} member={m} />
              ))}
            </div>
          </section>
        ) : null}

        {pinnedFiles.length > 0 ? (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Pinned files
            </h3>
            <ul className="space-y-1.5">
              {pinnedFiles.map((f) => (
                <li key={f.id}>
                  {f.href ? (
                    <a
                      href={f.href}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-bg)]"
                    >
                      <FileText className="h-4 w-4 text-[var(--color-accent)]" />
                      <span className="truncate">{f.name}</span>
                    </a>
                  ) : (
                    <span className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium text-[var(--color-text-primary)]">
                      <FileText className="h-4 w-4 text-[var(--color-accent)]" />
                      <span className="truncate">{f.name}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {upcomingEvents.length > 0 ? (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Upcoming events
            </h3>
            <ul className="space-y-2">
              {upcomingEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-xl bg-[var(--color-bg)]/70 px-3.5 py-3 ring-1 ring-[var(--color-border)]/60"
                >
                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {ev.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                    {format(new Date(ev.startsAt), "MMM d, yyyy · h:mm a")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </DsDrawer>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span
        className={cn(
          "max-w-[60%] text-right font-medium text-[var(--color-text-primary)]"
        )}
      >
        {value}
      </span>
    </div>
  );
}
