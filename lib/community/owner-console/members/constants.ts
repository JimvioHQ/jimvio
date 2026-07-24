/**
 * Labels, defaults, and helpers for Owner Members Management.
 */

import type { WorkspaceRole } from "@/lib/community/workspace/types";
import {
  MEMBER_ASSIGNABLE_ROLES,
  MEMBER_FILTER_STATUSES,
  MEMBER_SORT_OPTIONS,
  MEMBER_STATUS_VALUES,
  type MemberStatus,
  type OwnerMemberBadge,
} from "./types";

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Active",
  pending: "Pending",
  invited: "Invited",
  muted: "Muted",
  timeout: "Timeout",
  suspended: "Suspended",
  banned: "Banned",
  paused: "Paused",
  cancelled: "Cancelled",
  expired: "Expired",
  removed: "Removed",
};

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  creator: "Creator",
  mentor: "Mentor",
  vip: "VIP",
  verified: "Verified",
  member: "Member",
  guest: "Guest",
};

export const DEFAULT_INVITE_EXPIRY_DAYS = 14;
export const DEFAULT_MUTE_MINUTES = 60;
export const DEFAULT_TIMEOUT_MINUTES = 24 * 60;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export const MEMBER_BULK_ACTIONS = [
  "assign_role",
  "assign_group",
  "remove_group",
  "mute",
  "ban",
  "export",
  "announce",
] as const;

export function normalizeMemberStatus(
  status: string | null | undefined,
  extras?: {
    mutedUntil?: string | null;
    timeoutUntil?: string | null;
    suspendedUntil?: string | null;
  }
): MemberStatus {
  const now = Date.now();
  if (extras?.mutedUntil && new Date(extras.mutedUntil).getTime() > now) {
    return "muted";
  }
  if (extras?.timeoutUntil && new Date(extras.timeoutUntil).getTime() > now) {
    return "timeout";
  }
  if (
    extras?.suspendedUntil &&
    new Date(extras.suspendedUntil).getTime() > now
  ) {
    return "suspended";
  }

  const raw = (status ?? "active").toLowerCase();
  if ((MEMBER_STATUS_VALUES as readonly string[]).includes(raw)) {
    return raw as MemberStatus;
  }
  if (raw === "banned") return "banned";
  return "active";
}

export function isAssignableRole(role: string): boolean {
  return (MEMBER_ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

export function buildMemberBadges(args: {
  role: string;
  isVerified: boolean;
  contributionScore: number;
  creatorScore: number;
  status: MemberStatus;
}): OwnerMemberBadge[] {
  const badges: OwnerMemberBadge[] = [];
  if (args.role === "owner" || args.role === "admin") {
    badges.push({ id: "staff", label: "Staff", tone: "accent" });
  }
  if (args.role === "moderator") {
    badges.push({ id: "mod", label: "Moderator", tone: "accent" });
  }
  if (args.isVerified || args.role === "verified") {
    badges.push({ id: "verified", label: "Verified", tone: "success" });
  }
  if (args.role === "vip") {
    badges.push({ id: "vip", label: "VIP", tone: "warn" });
  }
  if (args.creatorScore >= 50 || args.role === "creator") {
    badges.push({ id: "creator", label: "Creator", tone: "accent" });
  }
  if (args.contributionScore >= 100) {
    badges.push({ id: "contributor", label: "Top contributor", tone: "success" });
  }
  if (args.status === "banned" || args.status === "suspended") {
    badges.push({ id: "restricted", label: "Restricted", tone: "warn" });
  }
  return badges;
}

export function inviteSharePath(slug: string, code: string): string {
  return `/communities/${encodeURIComponent(slug)}?invite=${encodeURIComponent(code)}`;
}

export function randomInviteCode(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return out;
}

export function roleAsWorkspace(role: string): WorkspaceRole | string {
  return role.toLowerCase();
}

export {
  MEMBER_FILTER_STATUSES,
  MEMBER_SORT_OPTIONS,
};
