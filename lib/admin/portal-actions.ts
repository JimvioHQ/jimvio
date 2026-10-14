"use server";

import { revalidatePath } from "next/cache";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { communityVisibilityPatch, requireAdminReason } from "@/lib/admin/portal-policy";
import { endLiveSessionForPlatformAdmin } from "@/services/live/session-service";
import { writeAuditEvent } from "@/services/ops/audit";
import { getAdminDB } from "@/services/db";

type ActionResult = { ok: true } | { ok: false; error: string };

async function actor() {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) return { error: auth.error } as const;
  return { user: auth.user } as const;
}

export async function archiveCommunityAction(formData: FormData): Promise<void> {
  const result = await archiveCommunity({
    id: String(formData.get("id") ?? ""),
    archived: formData.get("archived") === "1",
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) throw new Error(result.error);
}

export async function archiveCommunity(input: { id: string; archived: boolean; reason: string }): Promise<ActionResult> {
  const auth = await actor();
  if ("error" in auth) return { ok: false, error: auth.error ?? "Unauthorized." };
  const reason = requireAdminReason(input.reason);
  if (!reason.ok) return reason;
  const admin = getAdminDB();
  const now = new Date().toISOString();
  const { data: before } = await admin.from("communities").select("id, archived_at, is_active").eq("id", input.id).maybeSingle();
  if (!before) return { ok: false, error: "Community not found." };
  const { error } = await admin
    .from("communities")
    .update({
      archived_at: input.archived ? now : null,
      archived_by: input.archived ? auth.user.id : null,
      is_active: !input.archived,
      updated_at: now,
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: "The community could not be updated." };
  await writeAuditEvent({
    actorId: auth.user.id,
    action: input.archived ? "community.archive" : "community.restore",
    entityType: "community",
    entityId: input.id,
    metadata: { reason: reason.reason, previous_archived_at: before.archived_at, previous_is_active: before.is_active },
  });
  revalidatePath("/admin/communities");
  return { ok: true };
}

export async function setCommunityVisibilityAction(formData: FormData): Promise<void> {
  const result = await setCommunityVisibility({
    id: String(formData.get("id") ?? ""),
    visibility: String(formData.get("visibility") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) throw new Error(result.error);
}

export async function setCommunityVisibility(input: { id: string; visibility: string; reason: string }): Promise<ActionResult> {
  const auth = await actor();
  if ("error" in auth) return { ok: false, error: auth.error ?? "Unauthorized." };
  const reason = requireAdminReason(input.reason);
  if (!reason.ok) return reason;
  const visibility = communityVisibilityPatch(input.visibility);
  if (!visibility.ok) return visibility;
  const admin = getAdminDB();
  const { data: before } = await admin.from("communities").select("id, visibility, visibility_mode").eq("id", input.id).maybeSingle();
  if (!before) return { ok: false, error: "Community not found." };
  const { error } = await admin
    .from("communities")
    .update({
      visibility: visibility.visibility,
      visibility_mode: visibility.visibility,
      is_private: visibility.isPrivate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: "Visibility could not be updated." };
  await writeAuditEvent({
    actorId: auth.user.id,
    action: "community.visibility",
    entityType: "community",
    entityId: input.id,
    metadata: { reason: reason.reason, previous: before.visibility_mode, next: visibility.visibility },
  });
  revalidatePath("/admin/communities");
  return { ok: true };
}

export async function setAffiliateActiveAction(formData: FormData): Promise<void> {
  const result = await setAffiliateActive({
    id: String(formData.get("id") ?? ""),
    active: formData.get("active") === "1",
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) throw new Error(result.error);
}

export async function setAffiliateActive(input: { id: string; active: boolean; reason: string }): Promise<ActionResult> {
  const auth = await actor();
  if ("error" in auth) return { ok: false, error: auth.error ?? "Unauthorized." };
  const reason = requireAdminReason(input.reason);
  if (!reason.ok) return reason;
  const admin = getAdminDB();
  const { data: before } = await admin.from("affiliates").select("id, is_active").eq("id", input.id).maybeSingle();
  if (!before) return { ok: false, error: "Affiliate not found." };
  const { error } = await admin.from("affiliates").update({ is_active: input.active, updated_at: new Date().toISOString() }).eq("id", input.id);
  if (error) return { ok: false, error: "The affiliate could not be updated." };
  await writeAuditEvent({
    actorId: auth.user.id,
    action: input.active ? "affiliate.restore" : "affiliate.suspend",
    entityType: "affiliate",
    entityId: input.id,
    metadata: { reason: reason.reason, previous_is_active: before.is_active },
  });
  revalidatePath("/admin/affiliates");
  return { ok: true };
}

export async function setCommunityFeaturedAction(formData: FormData): Promise<void> {
  const result = await setCommunityFeatured({
    id: String(formData.get("id") ?? ""),
    featured: formData.get("featured") === "1",
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) throw new Error(result.error);
}

export async function setCommunityFeatured(input: { id: string; featured: boolean; reason: string }): Promise<ActionResult> {
  const auth = await actor();
  if ("error" in auth) return { ok: false, error: auth.error ?? "Unauthorized." };
  const reason = requireAdminReason(input.reason);
  if (!reason.ok) return reason;
  const admin = getAdminDB();
  const { data: before } = await admin.from("communities").select("id, is_featured").eq("id", input.id).maybeSingle();
  if (!before) return { ok: false, error: "Community not found." };
  const { error } = await admin.from("communities").update({ is_featured: input.featured, updated_at: new Date().toISOString() }).eq("id", input.id);
  if (error) return { ok: false, error: "The community could not be updated." };
  await writeAuditEvent({
    actorId: auth.user.id,
    action: input.featured ? "community.feature" : "community.unfeature",
    entityType: "community",
    entityId: input.id,
    metadata: { reason: reason.reason, previous_is_featured: before.is_featured },
  });
  revalidatePath("/admin/communities");
  return { ok: true };
}

export async function moderateCommunityPostAction(formData: FormData): Promise<void> {
  const result = await moderateCommunityPost({
    id: String(formData.get("id") ?? ""),
    archived: formData.get("archived") === "1",
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) throw new Error(result.error);
}

export async function moderateCommunityPost(input: { id: string; archived: boolean; reason: string }): Promise<ActionResult> {
  const auth = await actor();
  if ("error" in auth) return { ok: false, error: auth.error ?? "Unauthorized." };
  const reason = requireAdminReason(input.reason);
  if (!reason.ok) return reason;
  const admin = getAdminDB();
  const { data: before } = await admin.from("community_posts").select("id, archived_at, is_published").eq("id", input.id).maybeSingle();
  if (!before) return { ok: false, error: "Post not found." };
  const now = new Date().toISOString();
  const { error } = await admin
    .from("community_posts")
    .update({
      archived_at: input.archived ? now : null,
      is_published: input.archived ? false : true,
      updated_at: now,
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: "The post could not be updated." };
  await writeAuditEvent({
    actorId: auth.user.id,
    action: input.archived ? "community_post.archive" : "community_post.restore",
    entityType: "community_post",
    entityId: input.id,
    metadata: { reason: reason.reason, previous_archived_at: before.archived_at, previous_is_published: before.is_published },
  });
  revalidatePath("/admin/communities/posts");
  return { ok: true };
}

export async function moderateCommunityCommentAction(formData: FormData): Promise<void> {
  const result = await moderateCommunityComment({
    id: String(formData.get("id") ?? ""),
    published: formData.get("published") === "1",
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) throw new Error(result.error);
}

export async function moderateCommunityComment(input: { id: string; published: boolean; reason: string }): Promise<ActionResult> {
  const auth = await actor();
  if ("error" in auth) return { ok: false, error: auth.error ?? "Unauthorized." };
  const reason = requireAdminReason(input.reason);
  if (!reason.ok) return reason;
  const admin = getAdminDB();
  const { data: before } = await admin.from("community_post_comments").select("id, is_published").eq("id", input.id).maybeSingle();
  if (!before) return { ok: false, error: "Comment not found." };
  const { error } = await admin.from("community_post_comments").update({ is_published: input.published }).eq("id", input.id);
  if (error) return { ok: false, error: "The comment could not be updated." };
  await writeAuditEvent({
    actorId: auth.user.id,
    action: input.published ? "community_comment.restore" : "community_comment.hide",
    entityType: "community_comment",
    entityId: input.id,
    metadata: { reason: reason.reason, previous_is_published: before.is_published },
  });
  revalidatePath("/admin/communities/posts");
  return { ok: true };
}

export async function endLiveAction(formData: FormData): Promise<void> {
  const result = await endLiveAsAdmin({
    id: String(formData.get("id") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) throw new Error(result.error);
}

export async function endLiveAsAdmin(input: { id: string; reason: string }): Promise<ActionResult> {
  const auth = await actor();
  if ("error" in auth) return { ok: false, error: auth.error ?? "Unauthorized." };
  const reason = requireAdminReason(input.reason);
  if (!reason.ok) return reason;
  const ended = await endLiveSessionForPlatformAdmin(input.id, auth.user.id);
  if ("error" in ended) return { ok: false, error: ended.error };
  await writeAuditEvent({
    actorId: auth.user.id,
    action: "live.end",
    entityType: "live_session",
    entityId: input.id,
    metadata: { reason: reason.reason },
  });
  revalidatePath("/admin/live");
  return { ok: true };
}
