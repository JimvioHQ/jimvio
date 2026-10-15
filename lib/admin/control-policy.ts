/**
 * Pure lifecycle rules for the platform admin control center.
 * Persistence and authorization live in server actions and route handlers.
 */

export type CommunityRecord = {
  is_active?: boolean | null;
  archived_at?: string | null;
};

export type CommunityOperation = "archive" | "restore" | "disable" | "enable";

export type CommunityPatch = {
  archived_at?: string | null;
  archived_by?: string | null;
  is_active?: boolean;
  updated_at: string;
};

export function describeCommunityState(row: CommunityRecord): "Archived" | "Disabled" | "Active" {
  if (row.archived_at) return "Archived";
  if (row.is_active === false) return "Disabled";
  return "Active";
}

/** Direct URLs, workspace, and discovery must all use this gate. */
export function communityIsOperational(row: CommunityRecord): boolean {
  return row.is_active !== false && !row.archived_at;
}

export function applyCommunityOperation(
  row: CommunityRecord,
  operation: CommunityOperation,
  now: string,
  actorId: string,
): { ok: true; idempotent: boolean; patch: CommunityPatch } | { ok: false; error: string } {
  if (operation === "archive") {
    if (row.archived_at) {
      return { ok: true, idempotent: true, patch: { updated_at: now } };
    }
    return {
      ok: true,
      idempotent: false,
      patch: { archived_at: now, archived_by: actorId, updated_at: now },
    };
  }
  if (operation === "restore") {
    if (!row.archived_at) {
      return { ok: true, idempotent: true, patch: { updated_at: now } };
    }
    return {
      ok: true,
      idempotent: false,
      patch: { archived_at: null, archived_by: null, updated_at: now },
    };
  }
  if (operation === "disable") {
    if (row.is_active === false) {
      return { ok: true, idempotent: true, patch: { updated_at: now } };
    }
    return { ok: true, idempotent: false, patch: { is_active: false, updated_at: now } };
  }
  if (row.is_active !== false) {
    return { ok: true, idempotent: true, patch: { updated_at: now } };
  }
  return { ok: true, idempotent: false, patch: { is_active: true, updated_at: now } };
}

export function communityPermanentDeleteAllowed(input: {
  memberCount: number;
  postCount: number;
}): { ok: true } | { ok: false; error: string } {
  if (input.memberCount > 0 || input.postCount > 0) {
    return {
      ok: false,
      error: "This community still has members or posts. Archive or disable it. Permanent deletion is not available.",
    };
  }
  return {
    ok: false,
    error: "Permanent community deletion is not available. Archive keeps members, posts, and moderation history.",
  };
}

export type PostRecord = {
  is_published?: boolean | null;
  archived_at?: string | null;
  hidden_at?: string | null;
  deleted_at?: string | null;
  comments_disabled?: boolean | null;
};

export type PostOperation =
  | "hide"
  | "unhide"
  | "archive"
  | "restore"
  | "disable_comments"
  | "enable_comments"
  | "soft_delete";

export type PostPatch = {
  is_published?: boolean;
  archived_at?: string | null;
  hidden_at?: string | null;
  deleted_at?: string | null;
  comments_disabled?: boolean;
  updated_at: string;
};

export function describePostState(row: PostRecord): "Deleted" | "Archived" | "Hidden" | "Published" | "Unpublished" {
  if (row.deleted_at) return "Deleted";
  if (row.archived_at) return "Archived";
  if (row.hidden_at || row.is_published === false) return row.hidden_at ? "Hidden" : "Unpublished";
  return "Published";
}

export function postIsPubliclyVisible(row: PostRecord): boolean {
  return row.is_published === true && !row.archived_at && !row.hidden_at && !row.deleted_at;
}

export function applyPostOperation(
  row: PostRecord,
  operation: PostOperation,
  now: string,
): { ok: true; idempotent: boolean; patch: PostPatch } | { ok: false; error: string } {
  if (row.deleted_at && operation !== "soft_delete") {
    return { ok: false, error: "This post is deleted. Comments and the community are unchanged." };
  }
  if (operation === "soft_delete") {
    if (row.deleted_at) return { ok: true, idempotent: true, patch: { updated_at: now } };
    return {
      ok: true,
      idempotent: false,
      patch: {
        deleted_at: now,
        archived_at: row.archived_at ?? now,
        is_published: false,
        updated_at: now,
      },
    };
  }
  if (operation === "hide") {
    if (row.archived_at) return { ok: false, error: "Archived posts are already off public feeds. Restore before hiding." };
    if (row.hidden_at) return { ok: true, idempotent: true, patch: { updated_at: now } };
    return { ok: true, idempotent: false, patch: { hidden_at: now, is_published: false, updated_at: now } };
  }
  if (operation === "unhide") {
    if (row.archived_at) return { ok: false, error: "Restore the archive before publishing this post." };
    if (!row.hidden_at && row.is_published !== false) {
      return { ok: true, idempotent: true, patch: { updated_at: now } };
    }
    return { ok: true, idempotent: false, patch: { hidden_at: null, is_published: true, updated_at: now } };
  }
  if (operation === "archive") {
    if (row.archived_at) return { ok: true, idempotent: true, patch: { updated_at: now } };
    return {
      ok: true,
      idempotent: false,
      patch: { archived_at: now, is_published: false, updated_at: now },
    };
  }
  if (operation === "restore") {
    if (!row.archived_at) return { ok: false, error: "This post is not archived." };
    return {
      ok: true,
      idempotent: false,
      patch: {
        archived_at: null,
        is_published: !row.hidden_at,
        updated_at: now,
      },
    };
  }
  if (operation === "disable_comments") {
    if (row.comments_disabled) return { ok: true, idempotent: true, patch: { updated_at: now } };
    return { ok: true, idempotent: false, patch: { comments_disabled: true, updated_at: now } };
  }
  if (!row.comments_disabled) return { ok: true, idempotent: true, patch: { updated_at: now } };
  return { ok: true, idempotent: false, patch: { comments_disabled: false, updated_at: now } };
}

export type CommentRecord = {
  is_published?: boolean | null;
  deleted_at?: string | null;
};

export type CommentOperation = "hide" | "unhide" | "soft_delete";

export function describeCommentState(row: CommentRecord): "Deleted" | "Hidden" | "Visible" {
  if (row.deleted_at) return "Deleted";
  if (row.is_published === false) return "Hidden";
  return "Visible";
}

export function commentIsPubliclyVisible(row: CommentRecord): boolean {
  return row.is_published !== false && !row.deleted_at;
}

export function applyCommentOperation(
  row: CommentRecord,
  operation: CommentOperation,
  now: string,
): { ok: true; idempotent: boolean; patch: { is_published?: boolean; deleted_at?: string | null } } | { ok: false; error: string } {
  if (row.deleted_at && operation !== "soft_delete") {
    return { ok: false, error: "This comment is deleted and stays in moderation history." };
  }
  if (operation === "soft_delete") {
    if (row.deleted_at) return { ok: true, idempotent: true, patch: {} };
    return { ok: true, idempotent: false, patch: { deleted_at: now, is_published: false } };
  }
  if (operation === "hide") {
    if (row.is_published === false) return { ok: true, idempotent: true, patch: {} };
    return { ok: true, idempotent: false, patch: { is_published: false } };
  }
  if (row.is_published !== false) return { ok: true, idempotent: true, patch: {} };
  return { ok: true, idempotent: false, patch: { is_published: true } };
}

export const POST_OPERATIONS = new Set<PostOperation>([
  "hide",
  "unhide",
  "archive",
  "restore",
  "disable_comments",
  "enable_comments",
  "soft_delete",
]);

export const COMMENT_OPERATIONS = new Set<CommentOperation>(["hide", "unhide", "soft_delete"]);

export const COMMUNITY_OPERATIONS = new Set<CommunityOperation>(["archive", "restore", "disable", "enable"]);

export function requireDestructiveConfirm(confirm: string): { ok: true } | { ok: false; error: string } {
  if (confirm.trim() !== "DELETE") {
    return { ok: false, error: "Type DELETE to confirm this soft-delete." };
  }
  return { ok: true };
}

export type UgcLifecycleAction = "pause" | "resume" | "cancel" | "complete";

const UGC_PATCH_KEYS = ["status", "updated_at"] as const;

export function ugcLifecycleDecision(input: {
  action: UgcLifecycleAction;
  status: string;
  escrowHeld: boolean;
  adminActivated: boolean;
}):
  | { ok: true; idempotent: true; status: string; from: null; touchesFunding: false }
  | { ok: true; idempotent: false; status: string; from: string[]; touchesFunding: false }
  | { ok: false; error: string; http: number } {
  const status = input.status;
  if (input.action === "pause") {
    if (status === "paused") return { ok: true, idempotent: true, status, from: null, touchesFunding: false };
    if (status === "active") return { ok: true, idempotent: false, status: "paused", from: ["active"], touchesFunding: false };
    return { ok: false, http: 409, error: "Only an active campaign can be paused." };
  }
  if (input.action === "resume") {
    if (status === "active") return { ok: true, idempotent: true, status, from: null, touchesFunding: false };
    if (status !== "paused") return { ok: false, http: 409, error: "Only a paused campaign can be resumed." };
    if (!input.escrowHeld && !input.adminActivated) {
      return {
        ok: false,
        http: 409,
        error: "Resume does not fund a campaign. Fund escrow, or use the separate activation override with a reason.",
      };
    }
    return { ok: true, idempotent: false, status: "active", from: ["paused"], touchesFunding: false };
  }
  if (input.action === "cancel") {
    if (status === "cancelled") return { ok: true, idempotent: true, status, from: null, touchesFunding: false };
    if (status === "completed") return { ok: false, http: 409, error: "Completed campaigns stay completed for reconciliation." };
    if (status === "draft" || status === "active" || status === "paused") {
      return { ok: true, idempotent: false, status: "cancelled", from: ["draft", "active", "paused"], touchesFunding: false };
    }
    return { ok: false, http: 409, error: "This campaign cannot be cancelled from its current state." };
  }
  if (status === "completed") return { ok: true, idempotent: true, status, from: null, touchesFunding: false };
  if (status === "cancelled" || status === "draft") {
    return { ok: false, http: 409, error: "Only an active or paused campaign can be completed." };
  }
  if (status === "active" || status === "paused") {
    return { ok: true, idempotent: false, status: "completed", from: ["active", "paused"], touchesFunding: false };
  }
  return { ok: false, http: 409, error: "This campaign cannot be completed from its current state." };
}

export function ugcLifecyclePatch(status: string, now: string): { status: string; updated_at: string } {
  const patch = { status, updated_at: now };
  const keys = Object.keys(patch);
  if (keys.some((key) => !UGC_PATCH_KEYS.includes(key as (typeof UGC_PATCH_KEYS)[number]))) {
    throw new Error("UGC lifecycle cannot change funding fields.");
  }
  return patch;
}

export function canRemovePlatformAdmin(input: {
  actorId: string;
  targetId: string;
  targetIsPlatformAdmin: boolean;
  activePlatformAdminCount: number;
}): { ok: true } | { ok: false; error: string } {
  if (input.actorId === input.targetId) {
    return { ok: false, error: "You cannot remove your own platform admin access." };
  }
  if (input.targetIsPlatformAdmin && input.activePlatformAdminCount <= 1) {
    return { ok: false, error: "The last platform admin cannot be removed." };
  }
  return { ok: true };
}

export function adminPageBounds(page: number, pageSize: number): { page: number; from: number; to: number } {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const size = pageSize > 0 ? pageSize : 30;
  const from = (safePage - 1) * size;
  return { page: safePage, from, to: from + size - 1 };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function adminSearchTerm(raw: string): { text: string; uuid: string | null } {
  const text = raw.replace(/[%_,]/g, "").trim();
  return { text, uuid: UUID_RE.test(text) ? text : null };
}
