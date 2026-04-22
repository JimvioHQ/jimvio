"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const TABS = ["Posts", "Courses", "Tasks", "Resources"] as const;

type TaskCompletionRow = {
  id: string;
  task_id: string;
  user_id: string;
  status: string;
  proof_text: string | null;
  proof_url: string | null;
  points_earned: number | null;
  created_at: string | null;
  profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export function CreatorContentPageClient({ communityId }: { communityId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Posts");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskCompletionsByTaskId, setTaskCompletionsByTaskId] = useState<Record<string, TaskCompletionRow[]>>({});
  const [taskModal, setTaskModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tTitle, setTTitle] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tType, setTType] = useState("daily");
  const [tDiff, setTDiff] = useState("easy");
  const [tPoints, setTPoints] = useState("10");
  const [tRoom, setTRoom] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: p }, { data: c }, { data: tk }] = await Promise.all([
      supabase
        .from("community_posts")
        .select("id, title, body, like_count, is_pinned, created_at, room_id, rooms(name)")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("community_courses").select("id, title, is_published, room_id, rooms(name)").eq("community_id", communityId),
      supabase.from("community_tasks").select("*").eq("community_id", communityId).order("created_at", { ascending: false }),
    ]);
    setPosts(p ?? []);
    setCourses(c ?? []);
    setTasks(tk ?? []);

    const taskIds = (tk ?? []).map((t) => t.id);
    const byTask: Record<string, TaskCompletionRow[]> = {};
    if (taskIds.length) {
      const { data: comp, error: compErr } = await supabase
        .from("task_completions")
        .select("id, task_id, user_id, status, proof_text, proof_url, points_earned, created_at")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });
      if (compErr) console.error("task_completions load:", compErr.message);

      const userIds = [...new Set((comp ?? []).map((r) => r.user_id))];
      const profileMap = new Map<string, NonNullable<TaskCompletionRow["profiles"]>>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", userIds);
        for (const p of profs ?? []) {
          profileMap.set(p.id, {
            full_name: p.full_name,
            username: p.username,
            avatar_url: p.avatar_url,
          });
        }
      }

      for (const row of comp ?? []) {
        const normalized: TaskCompletionRow = {
          ...row,
          profiles: profileMap.get(row.user_id) ?? null,
        };
        const list = byTask[normalized.task_id] ?? [];
        list.push(normalized);
        byTask[normalized.task_id] = list;
      }
    }
    setTaskCompletionsByTaskId(byTask);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePin(postId: string, pinned: boolean) {
    const supabase = createClient();
    await supabase.from("community_posts").update({ is_pinned: !pinned }).eq("id", postId);
    await load();
  }

  async function deletePost(postId: string) {
    if (!confirm("Delete this post?")) return;
    const supabase = createClient();
    await supabase.from("community_posts").delete().eq("id", postId);
    await load();
  }

  async function toggleCoursePub(id: string, pub: boolean) {
    const supabase = createClient();
    await supabase.from("community_courses").update({ is_published: !pub }).eq("id", id);
    await load();
  }

  async function toggleTaskActive(id: string, active: boolean) {
    const supabase = createClient();
    await supabase.from("community_tasks").update({ is_active: !active }).eq("id", id);
    await load();
  }

  async function createTask() {
    if (!tTitle.trim() || !tRoom) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("community_tasks").insert({
        community_id: communityId,
        room_id: tRoom,
        creator_id: user.id,
        title: tTitle.trim(),
        description: tDesc.trim() || null,
        task_type: tType,
        difficulty: tDiff,
        points: parseInt(tPoints, 10) || 10,
      });
      setTaskModal(false);
      setTTitle("");
      setTDesc("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Content</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Posts, courses, tasks, and resources across your community.</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-none text-sm font-black",
              tab === t ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : (
        <>
          {tab === "Posts" && (
            <div className="rounded-none border border-[var(--color-border)] overflow-x-auto bg-[var(--color-surface)]">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 text-[10px] font-black uppercase text-[var(--color-text-muted)] text-left">
                    <th className="py-2 px-3">Title</th>
                    <th className="py-2 px-3">Room</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Likes</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)]">
                      <td className="py-2 px-3 font-semibold max-w-[200px] truncate">{p.title || p.body?.slice(0, 40)}</td>
                      <td className="py-2 px-3 text-xs text-[var(--color-text-muted)]">{(p.rooms as { name?: string } | null)?.name || ""”"}</td>
                      <td className="py-2 px-3 text-xs">{p.created_at ? new Date(p.created_at).toLocaleString() : ""”"}</td>
                      <td className="py-2 px-3">{p.like_count ?? 0}</td>
                      <td className="py-2 px-3 flex gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => togglePin(p.id, p.is_pinned)}>
                          <Pin className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-[var(--color-danger)]" onClick={() => deletePost(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {posts.length === 0 && <p className="text-center text-sm text-[var(--color-text-muted)] py-10">No posts yet.</p>}
            </div>
          )}

          {tab === "Courses" && (
            <div className="space-y-3">
              {courses.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div>
                    <p className="font-black">{c.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Room: {(c.rooms as { name?: string } | null)?.name || ""”"}</p>
                  </div>
                  <span className="text-xs font-black px-2 py-1 rounded-none bg-[var(--color-surface-secondary)]">{c.is_published ? "Published" : "Draft"}</span>
                  <Button type="button" variant="outline" className="rounded-none text-xs" onClick={() => toggleCoursePub(c.id, c.is_published)}>
                    {c.is_published ? "Unpublish" : "Publish"}
                  </Button>
                </div>
              ))}
              {courses.length === 0 && <p className="text-sm text-[var(--color-text-muted)] py-8 text-center border border-dashed border-[var(--color-border)] rounded-none">No courses yet.</p>}
            </div>
          )}

          {tab === "Tasks" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button type="button" className="rounded-none bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black" onClick={() => setTaskModal(true)}>
                  Create Task
                </Button>
              </div>
              {tasks.map((t) => {
                const subs = taskCompletionsByTaskId[t.id] ?? [];
                return (
                  <div key={t.id} className="rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-black">{t.title}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {t.task_type} Â· {t.difficulty} Â· {t.points} pts Â· submissions: {subs.length}
                        </p>
                      </div>
                      <Button type="button" variant="outline" className="rounded-none text-xs" onClick={() => toggleTaskActive(t.id, t.is_active)}>
                        {t.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                    {subs.length > 0 && (
                      <details className="border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                        <summary className="cursor-pointer list-none px-4 py-2 text-xs font-black text-[var(--color-accent)] hover:bg-[var(--color-surface-secondary)]/60 [&::-webkit-details-marker]:hidden flex items-center gap-2">
                          View who completed ({subs.length})
                        </summary>
                        <div className="px-4 pb-4 overflow-x-auto">
                          <table className="w-full text-xs min-w-[520px]">
                            <thead>
                              <tr className="text-left text-[10px] font-black uppercase text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                                <th className="py-2 pr-2">Member</th>
                                <th className="py-2 pr-2">Status</th>
                                <th className="py-2 pr-2">Points</th>
                                <th className="py-2 pr-2">Submitted</th>
                                <th className="py-2">Proof</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subs.map((s) => (
                                <tr key={s.id} className="border-b border-[var(--color-border)]/70">
                                  <td className="py-2 pr-2 font-semibold text-[var(--color-text-primary)]">
                                    {s.profiles?.full_name || s.profiles?.username || s.user_id.slice(0, 8) + "…"}
                                  </td>
                                  <td className="py-2 pr-2 capitalize">{s.status}</td>
                                  <td className="py-2 pr-2">{s.points_earned ?? ""”"}</td>
                                  <td className="py-2 pr-2 whitespace-nowrap">{s.created_at ? new Date(s.created_at).toLocaleString() : ""”"}</td>
                                  <td className="py-2 max-w-[200px]">
                                    {s.proof_url ? (
                                      <a href={s.proof_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] font-bold truncate block">
                                        Link
                                      </a>
                                    ) : null}
                                    {s.proof_text ? <span className="text-[var(--color-text-muted)] line-clamp-2 block">{s.proof_text}</span> : null}
                                    {!s.proof_url && !s.proof_text ? ""”" : null}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
              {tasks.length === 0 && <p className="text-sm text-[var(--color-text-muted)] py-8 text-center border border-dashed border-[var(--color-border)] rounded-none">No tasks yet.</p>}
            </div>
          )}

          {tab === "Resources" && (
            <p className="text-sm text-[var(--color-text-muted)] py-8 text-center border border-dashed border-[var(--color-border)] rounded-none">
              Manage files and links via resource rooms and posts with attachments. Upload flows can be wired to your storage provider.
            </p>
          )}
        </>
      )}

      <Dialog open={taskModal} onOpenChange={setTaskModal}>
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-surface)] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black !text-[var(--color-text-primary)]">New task</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Title" value={tTitle} onChange={(e) => setTTitle(e.target.value)} className="rounded-none" />
            <Textarea placeholder="Description" value={tDesc} onChange={(e) => setTDesc(e.target.value)} rows={3} className="rounded-none" />
            <select value={tType} onChange={(e) => setTType(e.target.value)} className="w-full rounded-none border border-[var(--color-border)] px-3 py-2 text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="challenge">Challenge</option>
              <option value="milestone">Milestone</option>
            </select>
            <select value={tDiff} onChange={(e) => setTDiff(e.target.value)} className="w-full rounded-none border border-[var(--color-border)] px-3 py-2 text-sm">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <Input type="number" value={tPoints} onChange={(e) => setTPoints(e.target.value)} className="rounded-none" placeholder="Points" />
            <RoomSelect communityId={communityId} value={tRoom} onChange={setTRoom} filterTasks />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-none" onClick={() => setTaskModal(false)}>
              Cancel
            </Button>
            <Button className="rounded-none bg-[var(--color-accent)] text-white font-black" disabled={saving} onClick={createTask}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoomSelect({
  communityId,
  value,
  onChange,
  filterTasks,
}: {
  communityId: string;
  value: string;
  onChange: (v: string) => void;
  filterTasks?: boolean;
}) {
  const [rooms, setRooms] = useState<{ id: string; name: string; room_type: string }[]>([]);
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("rooms")
      .select("id, name, room_type")
      .eq("community_id", communityId)
      .then(({ data }) => {
        const list = (data ?? []).filter((r) => !filterTasks || r.room_type === "tasks");
        setRooms(list);
        if (list.length && !value) onChange(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init default room once
  }, [communityId, filterTasks]);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-none border border-[var(--color-border)] px-3 py-2 text-sm">
      {rooms.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name} ({r.room_type})
        </option>
      ))}
    </select>
  );
}

