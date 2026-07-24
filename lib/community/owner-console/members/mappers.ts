/**
 * Map DB membership rows ↔ Owner Member list items.
 */

import type { WorkspaceRole } from "@/lib/community/workspace/types";
import {
  buildMemberBadges,
  normalizeMemberStatus,
} from "./constants";
import type {
  OwnerJoinRequest,
  OwnerMemberInvite,
  OwnerMemberListItem,
  OwnerMemberNote,
  OwnerModerationLog,
} from "./types";

export type MembershipManagementRow = {
  id: string;
  community_id: string;
  user_id: string;
  role: string | null;
  status: string | null;
  plan_type: string | null;
  space_access: string[] | null;
  subscribed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  muted_until?: string | null;
  timeout_until?: string | null;
  suspended_until?: string | null;
  ban_reason?: string | null;
  last_active_at?: string | null;
  contribution_score?: number | null;
  creator_score?: number | null;
  profiles?: ProfileLite | ProfileLite[] | null;
};

export type ProfileLite = {
  id?: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email?: string | null;
  is_verified?: boolean | null;
};

export const MEMBERSHIP_SELECT = `
  id, community_id, user_id, role, status, plan_type, space_access,
  subscribed_at, created_at, updated_at,
  muted_until, timeout_until, suspended_until, ban_reason,
  last_active_at, contribution_score, creator_score,
  profiles:user_id(id, full_name, username, avatar_url, email, is_verified)
`.replace(/\s+/g, " ").trim();

export function asMembershipRow(data: unknown): MembershipManagementRow | null {
  if (!data || typeof data !== "object") return null;
  return data as MembershipManagementRow;
}

export function asMembershipRows(data: unknown): MembershipManagementRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((r) => asMembershipRow(r))
    .filter((r): r is MembershipManagementRow => !!r);
}

function profileOf(row: MembershipManagementRow): ProfileLite | null {
  const p = row.profiles;
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export function mapMembershipToOwnerMember(
  row: MembershipManagementRow,
  extras?: {
    groupNames?: string[];
    channelCount?: number;
    isOnline?: boolean;
    includeEmail?: boolean;
  }
): OwnerMemberListItem {
  const profile = profileOf(row);
  const role = (row.role ?? "member").toLowerCase();
  const contribution = Number(row.contribution_score ?? 0);
  const creatorScore = Number(row.creator_score ?? 0);
  const isVerified = Boolean(profile?.is_verified) || role === "verified";
  const status = normalizeMemberStatus(row.status, {
    mutedUntil: row.muted_until,
    timeoutUntil: row.timeout_until,
    suspendedUntil: row.suspended_until,
  });
  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    "Member";

  return {
    id: row.id,
    communityId: row.community_id,
    userId: row.user_id,
    displayName,
    username: profile?.username ?? null,
    email: extras?.includeEmail ? profile?.email ?? null : null,
    avatarUrl: profile?.avatar_url ?? null,
    role: role as WorkspaceRole | string,
    status,
    planType: row.plan_type ?? null,
    groupIds: Array.isArray(row.space_access) ? row.space_access : [],
    groupNames: extras?.groupNames ?? [],
    channelCount: extras?.channelCount ?? 0,
    joinedAt: row.subscribed_at ?? row.created_at ?? null,
    lastActiveAt: row.last_active_at ?? row.updated_at ?? null,
    contributionScore: contribution,
    creatorScore,
    isVerified,
    isOnline: Boolean(extras?.isOnline),
    badges: buildMemberBadges({
      role,
      isVerified,
      contributionScore: contribution,
      creatorScore,
      status,
    }),
    mutedUntil: row.muted_until ?? null,
    timeoutUntil: row.timeout_until ?? null,
    suspendedUntil: row.suspended_until ?? null,
    banReason: row.ban_reason ?? null,
  };
}

export function mapInviteRow(
  row: {
    id: string;
    community_id: string;
    code: string;
    email: string | null;
    role: string;
    status: string;
    max_uses: number | null;
    uses_count: number;
    expires_at: string | null;
    created_at: string;
    note: string | null;
  },
  slug: string,
  origin: string
): OwnerMemberInvite {
  return {
    id: row.id,
    communityId: row.community_id,
    code: row.code,
    email: row.email,
    role: row.role,
    status: row.status,
    maxUses: row.max_uses,
    usesCount: row.uses_count,
    expiresAt: row.expires_at,
    shareUrl: `${origin}/communities/${encodeURIComponent(slug)}?invite=${encodeURIComponent(row.code)}`,
    createdAt: row.created_at,
    note: row.note,
  };
}

export function mapJoinRequestRow(row: {
  id: string;
  community_id: string;
  user_id: string;
  reason: string | null;
  referral_code: string | null;
  status: string;
  created_at: string;
  profiles?: ProfileLite | ProfileLite[] | null;
  referred?: ProfileLite | ProfileLite[] | null;
}): OwnerJoinRequest {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const referred = Array.isArray(row.referred) ? row.referred[0] : row.referred;
  return {
    id: row.id,
    communityId: row.community_id,
    userId: row.user_id,
    displayName:
      profile?.full_name?.trim() || profile?.username?.trim() || "Member",
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    reason: row.reason,
    referralCode: row.referral_code,
    referredByName: referred?.full_name ?? referred?.username ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapNoteRow(row: {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  profiles?: ProfileLite | ProfileLite[] | null;
}): OwnerMemberNote {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    body: row.body,
    authorId: row.author_id,
    authorName: profile?.full_name ?? profile?.username ?? null,
    createdAt: row.created_at,
  };
}

export function mapModerationLogRow(row: {
  id: string;
  action: string;
  reason: string | null;
  moderator_id: string;
  created_at: string;
  profiles?: ProfileLite | ProfileLite[] | null;
}): OwnerModerationLog {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    action: row.action,
    reason: row.reason,
    moderatorId: row.moderator_id,
    moderatorName: profile?.full_name ?? profile?.username ?? null,
    createdAt: row.created_at,
  };
}
