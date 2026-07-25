"use client";

import { format } from "date-fns";
import {
  Calendar,
  Eye,
  Globe,
  Layers,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DsDrawer } from "@/components/design-system/DsDrawer";
import {
  SPACE_TYPE_LABELS,
  type SpaceType,
  isSpaceType,
} from "@/lib/community/workspace/space-types";
import type { WorkspaceGroup } from "@/lib/community/workspace";

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

export function SpaceAboutPanel({
  open,
  onClose,
  group,
  spaceType,
  ownerName,
  createdAt,
  description,
  members,
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
    "This is the main discussion space for the community. Share updates, ask questions, and connect with other members.";
  const visibility =
    group.privacy === "public"
      ? "Public"
      : group.privacy === "premium"
        ? "Premium"
        : "Private";
  const shown = members.slice(0, 5);
  const extra = Math.max(0, members.length - shown.length);

  return (
    <DsDrawer open={open} onClose={onClose} title="About this space" side="right">
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-6">
          <p className="text-[13px] leading-relaxed text-gray-600">{about}</p>

          <dl className="space-y-3.5 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-gray-500">
                <Layers className="h-4 w-4" aria-hidden />
                Space type
              </dt>
              <dd>
                <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-600">
                  {typeLabel}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-gray-500">
                <UserRound className="h-4 w-4" aria-hidden />
                Created by
              </dt>
              <dd className="font-medium text-gray-900">
                {ownerName?.trim() || "Community owner"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4" aria-hidden />
                Created on
              </dt>
              <dd className="font-medium text-gray-900">
                {createdAt ? format(new Date(createdAt), "MMM d, yyyy") : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-gray-500">
                <Eye className="h-4 w-4" aria-hidden />
                Visibility
              </dt>
              <dd className="font-medium text-gray-900">{visibility}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-gray-500">
                <Globe className="h-4 w-4" aria-hidden />
                Language
              </dt>
              <dd className="font-medium text-gray-900">English</dd>
            </div>
          </dl>

          <section>
            <h3 className="mb-3 text-[13px] font-semibold text-gray-900">
              Members ({members.length || group.memberCount})
            </h3>
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
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-600 ring-2 ring-white"
                    style={{ marginLeft: -8 }}
                  >
                    +{extra}
                  </span>
                ) : null}
              </div>
            )}
          </section>
        </div>

        <button
          type="button"
          onClick={() => {
            onViewDetails?.();
            onClose();
          }}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#fd5000] text-[14px] font-semibold text-white transition hover:bg-[#e04700]"
        >
          View all details
        </button>
      </div>
    </DsDrawer>
  );
}
