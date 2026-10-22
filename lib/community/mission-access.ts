import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notifyUser } from "@/lib/notifications/notify-user";
import {
  missionIsOpen,
  validateMissionDraft,
  validateSubmission,
  type MissionDraftInput,
} from "@/lib/community/mission-rules";

function admin() {
  return createServiceRoleClient() as any;
}

const MANAGE_ROLES = ["owner", "admin", "moderator"];

async function access(userId: string, communityId: string) {
  const supabase = await createClient();
  const [{ data: membership }, { data: community }] = await Promise.all([
    supabase
      .from("community_memberships")
      .select("role")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("communities").select("id, owner_id, name, slug, visibility").eq("id", communityId).maybeSingle(),
  ]);
  const canManage =
    community?.owner_id === userId || MANAGE_ROLES.includes(String(membership?.role ?? ""));
  return { community, canManage, isMember: Boolean(membership) || community?.owner_id === userId };
}

function shape(task: any, extra: Record<string, unknown> = {}) {
  const community = task.communities ?? null;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    instructions: task.instructions,
    completion_criteria: task.completion_criteria,
    due_date: task.due_date,
    starts_at: task.starts_at,
    points: task.reward_type === "none" ? 0 : task.points ?? 0,
    reward_type: task.reward_type ?? "points",
    completion_count: task.completion_count ?? 0,
    category: task.category,
    tags: task.tags ?? [],
    cover_url: task.cover_url,
    visibility: task.visibility ?? "community",
    status: task.status ?? (task.is_active ? "published" : "paused"),
    submission_kind: task.submission_kind ?? "text",
    review_mode: task.review_mode ?? "review",
    max_participants: task.max_participants,
    community_name: community?.name ?? "Community",
    community_slug: community?.slug ?? "",
    href: `/communities/missions/${task.id}`,
    ...extra,
  };
}

export async function listMissions(input: {
  userId: string;
  filter?: string;
  q?: string;
  category?: string;
  cursor?: number;
  communityId?: string;
  manage?: boolean;
}) {
  const limit = 12;
  const offset = Math.max(input.cursor ?? 0, 0);
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", input.userId)
    .eq("status", "active");
  const communityIds = (memberships ?? []).map((row) => row.community_id);

  let query = admin().from("community_tasks").select("*, communities(name, slug)", { count: "exact" });
  if (input.manage && input.communityId) {
    const gate = await access(input.userId, input.communityId);
    if (!gate.canManage) throw new Error("Not authorized to manage missions");
    query = query.eq("community_id", input.communityId);
  } else if (input.filter === "organized") {
    query = query.eq("creator_id", input.userId);
  } else {
    query = query.eq("status", "published");
  }

  if (input.category) query = query.ilike("category", input.category.slice(0, 40));
  if (input.q) {
    const q = input.q.replace(/[%_,]/g, "").slice(0, 80);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  const { data, error } = await query.order("due_date", { ascending: true, nullsFirst: false }).range(offset, offset + limit - 1);
  if (error) throw error;

  const visible = (data ?? []).filter((task: any) => {
    if (input.manage || input.filter === "organized" || task.creator_id === input.userId) return true;
    if (task.visibility === "public" && task.status === "published") return true;
    return communityIds.includes(task.community_id) && task.status === "published";
  });

  const ids = visible.map((task: any) => task.id);
  const progress = new Map<string, string>();
  if (ids.length) {
    const { data: rows } = await admin()
      .from("task_completions")
      .select("task_id, status")
      .eq("user_id", input.userId)
      .in("task_id", ids);
    for (const row of rows ?? []) progress.set(row.task_id, row.status);
  }

  const filtered = visible.filter((task: any) => {
    const state = progress.get(task.id);
    if (input.filter === "completed") return state === "approved" || state === "completed";
    if (input.filter === "active") return task.status === "published" && state !== "approved";
    if (input.filter === "in_progress") return state === "joined" || state === "submitted" || state === "rejected";
    return true;
  });

  return {
    missions: filtered.map((task: any) =>
      shape(task, {
        participant_status: progress.get(task.id) ?? "not_started",
        is_completed: ["approved", "completed"].includes(progress.get(task.id) ?? ""),
      }),
    ),
    nextCursor: filtered.length === limit ? offset + limit : null,
  };
}

export async function saveMission(input: {
  userId: string;
  communityId: string;
  missionId?: string | null;
  draft: MissionDraftInput;
}) {
  const parsed = validateMissionDraft(input.draft);
  if (!parsed.ok) throw new Error(parsed.error);
  const gate = await access(input.userId, input.communityId);
  if (!gate.canManage) throw new Error("Only owners and moderators can manage missions");
  const value = parsed.value;
  const row = {
    community_id: input.communityId,
    title: value.title,
    description: value.description ?? null,
    instructions: value.instructions ?? null,
    completion_criteria: value.completionCriteria ?? null,
    category: value.category ?? null,
    tags: value.tags ?? [],
    visibility: value.visibility,
    status: value.status,
    is_active: value.status === "published",
    starts_at: value.startsAt ?? null,
    due_date: value.endsAt ?? null,
    max_participants: value.maxParticipants ?? null,
    submission_kind: value.submissionKind,
    review_mode: value.reviewMode,
    reward_type: value.rewardType,
    points: value.points ?? 0,
    cover_url: value.coverUrl ?? null,
    updated_at: new Date().toISOString(),
  };
  if (input.missionId) {
    const existing = await admin().from("community_tasks").select("id, community_id, creator_id").eq("id", input.missionId).maybeSingle();
    if (!existing.data) throw new Error("Mission not found");
    const owner = await access(input.userId, existing.data.community_id);
    if (!owner.canManage && existing.data.creator_id !== input.userId) {
      throw new Error("Not authorized to edit this mission");
    }
    const updateRow = { ...row, community_id: existing.data.community_id };
    const { data, error } = await admin().from("community_tasks").update(updateRow).eq("id", input.missionId).select("*").single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await admin()
    .from("community_tasks")
    .insert({ ...row, creator_id: input.userId, task_type: "mission", difficulty: "easy" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getMissionForViewer(userId: string, missionId: string) {
  const { data: task } = await admin()
    .from("community_tasks")
    .select("*, communities(name, slug, owner_id)")
    .eq("id", missionId)
    .maybeSingle();
  if (!task) return null;
  const gate = await access(userId, task.community_id);
  const canManage = gate.canManage || task.creator_id === userId;
  const memberVisible = task.visibility !== "public" ? gate.isMember : true;
  if (!canManage && (!memberVisible || !["published", "completed"].includes(task.status))) return null;
  const { data: completion } = await admin()
    .from("task_completions")
    .select("id, status, proof_text, proof_url, file_url, feedback, points_earned, reviewed_at")
    .eq("task_id", task.id)
    .eq("user_id", userId)
    .maybeSingle();
  return shape(task, {
    can_manage: canManage,
    participant_status: completion?.status ?? "not_started",
    submission: completion
      ? {
          status: completion.status,
          text: completion.proof_text,
          url: completion.proof_url || completion.file_url,
          feedback: completion.feedback,
          points_earned: completion.points_earned,
        }
      : null,
    is_completed: completion?.status === "approved",
  });
}

export async function joinOrSubmitMission(input: {
  userId: string;
  missionId: string;
  text?: string | null;
  url?: string | null;
}) {
  const mission = await getMissionForViewer(input.userId, input.missionId);
  if (!mission) throw new Error("Mission not found");
  const { data: task } = await admin().from("community_tasks").select("*").eq("id", input.missionId).single();
  const open = missionIsOpen(task);
  const participantStatus = (mission as { participant_status?: string }).participant_status;
  if (!open.ok && participantStatus === "not_started") throw new Error(open.error);

  const { data: existing } = await admin()
    .from("task_completions")
    .select("id, status, points_earned")
    .eq("task_id", task.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (existing && ["approved", "completed", "submitted"].includes(existing.status) && task.submission_kind !== "none") {
    if (existing.status !== "rejected") throw new Error("You already have a submission for this mission.");
  }
  if (existing?.status === "approved") throw new Error("This mission is already completed.");

  if (!existing && task.max_participants) {
    const { count } = await admin()
      .from("task_completions")
      .select("id", { count: "exact", head: true })
      .eq("task_id", task.id)
      .neq("status", "rejected");
    if ((count ?? 0) >= Number(task.max_participants)) throw new Error("This mission has reached its participant limit.");
  }

  const submitting = task.submission_kind === "none" || Boolean(input.text || input.url);
  if (submitting && task.submission_kind !== "none") {
    const check = validateSubmission(task.submission_kind, { text: input.text, url: input.url });
    if (!check.ok) throw new Error(check.error);
  }
  const autoApprove = task.review_mode === "auto" && task.submission_kind === "none";
  const nextStatus = !submitting ? "joined" : autoApprove ? "approved" : "submitted";
  const points = nextStatus === "approved" && task.reward_type !== "none" ? Number(task.points ?? 0) : 0;
  if (existing?.points_earned && nextStatus === "approved") {
    throw new Error("Reward already recorded for this mission.");
  }

  const payload = {
    task_id: task.id,
    user_id: input.userId,
    proof_text: input.text?.trim() || null,
    proof_url: task.submission_kind === "link" ? input.url?.trim() || null : null,
    file_url: task.submission_kind === "file" ? input.url?.trim() || null : null,
    status: nextStatus,
    points_earned: existing?.status === "approved" ? existing.points_earned : points,
    updated_at: new Date().toISOString(),
  };
  const write = existing
    ? await admin().from("task_completions").update(payload).eq("id", existing.id).select("*").single()
    : await admin().from("task_completions").insert(payload).select("*").single();
  if (write.error) {
    if (String(write.error.message).toLowerCase().includes("duplicate")) {
      throw new Error("You already have a submission for this mission.");
    }
    throw write.error;
  }
  return { status: write.data.status, points_earned: write.data.points_earned ?? 0 };
}

export async function reviewMissionSubmission(input: {
  userId: string;
  missionId: string;
  participantId: string;
  decision: "approved" | "rejected" | "changes_requested";
  feedback?: string | null;
}) {
  const { data: task } = await admin().from("community_tasks").select("*").eq("id", input.missionId).maybeSingle();
  if (!task) throw new Error("Mission not found");
  const gate = await access(input.userId, task.community_id);
  if (!gate.canManage && task.creator_id !== input.userId) throw new Error("Not authorized to review this mission");
  const { data: row } = await admin()
    .from("task_completions")
    .select("*")
    .eq("task_id", task.id)
    .eq("user_id", input.participantId)
    .maybeSingle();
  if (!row) throw new Error("Submission not found");
  if (row.status === "approved" && row.points_earned > 0 && input.decision === "approved") {
    throw new Error("This submission was already approved.");
  }
  const status = input.decision === "changes_requested" ? "rejected" : input.decision;
  const points =
    input.decision === "approved" && task.reward_type !== "none" && !row.points_earned
      ? Number(task.points ?? 0)
      : row.points_earned ?? 0;
  const { error } = await admin()
    .from("task_completions")
    .update({
      status,
      feedback: input.feedback?.trim() || null,
      points_earned: points,
      reviewed_by: input.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) throw error;
  await notifyUser(admin(), {
    userId: input.participantId,
    type: "community",
    title: input.decision === "approved" ? "Mission approved" : "Mission needs another look",
    message: input.feedback?.trim() || `Your submission for ${task.title} was ${input.decision.replace("_", " ")}.`,
    actionUrl: `/communities/missions/${task.id}`,
    category: "system",
    eventKey: `mission-review-${row.id}-${input.decision}`,
  });
  return { status, points_earned: points };
}

export async function listMissionSubmissions(input: { userId: string; missionId: string; cursor?: number }) {
  const { data: task } = await admin().from("community_tasks").select("id, community_id, creator_id").eq("id", input.missionId).maybeSingle();
  if (!task) throw new Error("Mission not found");
  const gate = await access(input.userId, task.community_id);
  if (!gate.canManage && task.creator_id !== input.userId) throw new Error("Not authorized");
  const offset = Math.max(input.cursor ?? 0, 0);
  const { data, error } = await admin()
    .from("task_completions")
    .select("id, user_id, status, proof_text, proof_url, file_url, feedback, points_earned, created_at")
    .eq("task_id", task.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + 19);
  if (error) throw error;
  return { submissions: data ?? [], nextCursor: (data ?? []).length === 20 ? offset + 20 : null };
}
