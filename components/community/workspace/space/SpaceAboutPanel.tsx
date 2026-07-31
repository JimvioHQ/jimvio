"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Eye,
  FileText,
  Layers,
  Pin,
  UserRound,
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

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Layers;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-gray-50/80 p-4 ring-1 ring-gray-100">
      <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
        <Icon className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
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
  pinnedFiles,
  upcomingEvents,
  onViewDetails,
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
  onViewDetails?: () => void;
}) {
  const resolvedType: SpaceType = isSpaceType(spaceType)
    ? spaceType
    : "discussion";
  const typeLabel = SPACE_TYPE_LABELS[resolvedType];
  const about =
    description?.trim() ||
    group.description?.trim() ||
    null;
  const visibility =
    group.privacy === "public"
      ? "Public"
      : group.privacy === "premium"
        ? "Premium"
        : "Private";
  const shown = members.slice(0, 5);
  const extra = Math.max(0, members.length - shown.length);
  const pinned = (pinnedFiles ?? []).filter((f) => f.name?.trim());
  const upcoming = (upcomingEvents ?? []).filter((e) => e.title?.trim());
  const rulesText = rules?.trim() || null;

  return (
    <DsDrawer open={open} onClose={onClose} title="About this space" side="right">
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          <InfoCard title="About" icon={FileText}>
            <p className="text-[13.5px] leading-relaxed text-gray-600">
              {about ||
                "This is the main discussion space for the community. Share updates, ask questions, and connect with other members."}
            </p>
          </InfoCard>

          <InfoCard title="Details" icon={Layers}>
            <dl className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Space type</dt>
                <dd>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200">
                    {typeLabel}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-gray-500">
                  <UserRound className="h-3.5 w-3.5" aria-hidden />
                  Created by
                </dt>
                <dd className="font-medium text-gray-900">
                  {ownerName?.trim() || "Community owner"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-gray-500">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  Created on
                </dt>
                <dd className="font-medium text-gray-900">
                  {createdAt ? format(new Date(createdAt), "MMM d, yyyy") : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-gray-500">
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  Visibility
                </dt>
                <dd className="font-medium text-gray-900">{visibility}</dd>
              </div>
            </dl>
          </InfoCard>

          <InfoCard title="Members" icon={Users}>
            <p className="mb-3 text-[12px] text-gray-500">
              {members.length || group.memberCount} members
            </p>
            {shown.length === 0 ? (
              <p className="text-[12px] text-gray-500">No members to show yet.</p>
            ) : (
              <div className="flex items-center">
                {shown.map((m, i) => (
                  <Avatar
                    key={m.id}
                    className="h-9 w-9 rounded-full ring-2 ring-white"
                    style={{ marginLeft: i === 0 ? 0 : -8 }}
                  >
                    {m.avatarUrl ? (
                      <AvatarImage
                        src={m.avatarUrl}
                        alt=""
                        className="rounded-full"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-[10px] font-bold text-white">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {extra > 0 ? (
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[11px] font-bold text-gray-600 ring-2 ring-white"
                    style={{ marginLeft: -8 }}
                  >
                    +{extra}
                  </span>
                ) : null}
              </div>
            )}
          </InfoCard>

          {pinned.length > 0 ? (
            <InfoCard title="Pinned" icon={Pin}>
              <ul className="space-y-2">
                {pinned.map((file) => (
                  <li key={file.id}>
                    {file.href ? (
                      <a
                        href={file.href}
                        className="block truncate text-[13px] font-medium text-gray-800 transition hover:text-[var(--color-accent)]"
                      >
                        {file.name}
                      </a>
                    ) : (
                      <span className="block truncate text-[13px] font-medium text-gray-800">
                        {file.name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </InfoCard>
          ) : null}

          {upcoming.length > 0 ? (
            <InfoCard title="Upcoming" icon={Calendar}>
              <ul className="space-y-2.5">
                {upcoming.map((event) => (
                  <li key={event.id} className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-gray-800">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {format(new Date(event.startsAt), "MMM d · h:mm a")}
                    </p>
                  </li>
                ))}
              </ul>
            </InfoCard>
          ) : null}

          {rulesText ? (
            <InfoCard title="Resources" icon={FileText}>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-gray-600">
                {rulesText}
              </p>
            </InfoCard>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            onViewDetails?.();
            onClose();
          }}
          className={cn(
            "mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl",
            "bg-[var(--color-accent)] text-[14px] font-semibold text-white",
            "shadow-[0_8px_20px_rgba(253,80,0,0.2)] transition hover:bg-[var(--color-accent-hover)]"
          )}
        >
          View all details
        </button>
      </div>
    </DsDrawer>
  );
}
