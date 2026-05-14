"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/components/community/workspace-context";

type Task = {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  difficulty: string;
  points: number | null;
  due_date: string | null;
  completion_count: number | null;
};

type Completion = { task_id: string; status: string };

const TABS = ["Daily", "Weekly", "Challenges", "All"] as const;

export function TasksRoom({
  roomId,
  roomName,
  hideHeader,
}: {
  roomId: string;
  roomName: string;
  communityId: string;
  slug: string;
  hideHeader?: boolean;
}) {
  const { communityId: cid } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Record<string, Completion>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [leaderboard, setLeaderboard] = useState<
    { user_id: string; total_points: number; profiles: { full_name: string | null; avatar_url: string | null; username: string | null } | null }[]
  >([]);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/room/${roomId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTasks(data.tasks ?? []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadCompletions() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || tasks.length === 0) return;
      const { data } = await supabase.from("task_completions").select("task_id, status").eq("user_id", user.id).in(
        "task_id",
        tasks.map((t) => t.id)
      );
      if (cancelled || !data) return;
      const map: Record<string, Completion> = {};
      data.forEach((r: { task_id: string; status: string }) => {
        map[r.task_id] = { task_id: r.task_id, status: r.status };
      });
      setCompletions(map);
    }
    loadCompletions();
    return () => {
      cancelled = true;
    };
  }, [tasks]);

  useEffect(() => {
    let cancelled = false;
    async function loadLb() {
      const supabase = createClient();
      const { data } = await supabase
        .from("member_points")
        .select("user_id, total_points, profiles(full_name, avatar_url, username)")
        .eq("community_id", cid)
        .order("total_points", { ascending: false })
        .limit(5);
      if (!cancelled && data) {
        setLeaderboard(
          data.map((row: { user_id: string; total_points: number; profiles: unknown }) => ({
            user_id: row.user_id,
            total_points: row.total_points,
            profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
          }))
        );
      }
    }
    loadLb();
    return () => {
      cancelled = true;
    };
  }, [cid]);

  const filtered = useMemo(() => {
    if (tab === "All") return tasks;
    const map: Record<string, string> = { Daily: "daily", Weekly: "weekly", Challenges: "challenge" };
    const key = map[tab];
    return tasks.filter((t) => t.task_type === key);
  }, [tasks, tab]);

  async function submitTask() {
    if (!modalTask) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${modalTask.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofText: proofText.trim(), proofUrl: proofUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setModalTask(null);
      setProofText("");
      setProofUrl("");
      await load();
      setCompletions((c) => ({ ...c, [modalTask.id]: { task_id: modalTask.id, status: "submitted" } }));
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  const { points } = useWorkspace();

  return (
    <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <div className={hideHeader ? "ml-auto text-right" : undefined}>
            {!hideHeader && <h1 className="text-lg font-black text-[var(--color-text-primary)]">{roomName}</h1>}
            <p className="text-xs text-[var(--color-text-muted)]">
              <span className="inline-flex items-center gap-1 font-bold text-[var(--color-accent)]">
                <Zap className="h-3.5 w-3.5" /> {(points?.total_points ?? 0).toLocaleString()} pts
              </span>
              <span className="mx-2">·</span>
              Level {points?.level ?? 1}
            </p>
          </div>
        </header>

        <div className="flex gap-2 px-4 py-2 border-b border-[var(--color-border)] overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 rounded-sm text-xs font-black whitespace-nowrap",
                tab === t ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No tasks in this filter.</p>
          ) : (
            filtered.map((task) => {
              const comp = completions[task.id];
              const diff = task.difficulty;
              const diffColor =
                diff === "hard" ? "text-[var(--color-danger)] bg-[var(--color-danger-light)]" : diff === "medium" ? "text-[var(--color-warning)] bg-[var(--color-warning-light)]" : "text-[var(--color-success)] bg-[var(--color-success-light)]";
              return (
                <div key={task.id} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-none">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-sm bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">{task.task_type}</span>
                    <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-sm", diffColor)}>{task.difficulty}</span>
                  </div>
                  <h3 className="font-black text-[var(--color-text-primary)]">{task.title}</h3>
                  <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mt-1">{task.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
                    <span className="font-bold text-[var(--color-accent)]">+{task.points ?? 0} pts</span>
                    {task.due_date && <span>Due {format(new Date(task.due_date), "MMM d")}</span>}
                    <span>{(task.completion_count ?? 0).toLocaleString()} completions</span>
                  </div>
                  <div className="mt-3">
                    {!comp && (
                      <Button type="button" className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black" onClick={() => setModalTask(task)}>
                        Complete Task
                      </Button>
                    )}
                    {comp?.status === "submitted" && (
                      <span className="text-xs font-black px-2 py-1 rounded-sm bg-[var(--color-warning-light)] text-[var(--color-warning)]">Submitted</span>
                    )}
                    {comp?.status === "approved" && (
                      <span className="text-xs font-black px-2 py-1 rounded-sm bg-[var(--color-success-light)] text-[var(--color-success)]">Completed ✓"</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <aside className="w-full lg:w-[280px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Top members</h3>
        <ol className="space-y-3">
          {leaderboard.map((row, i) => (
            <li key={row.user_id} className="flex items-center gap-2">
              <span className="text-xs font-black w-5 text-[var(--color-text-muted)]">{i + 1}</span>
              <div className="h-8 w-8 rounded-sm overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                {row.profiles?.avatar_url && row.profiles?.avatar_url.trim() ? (
                  <Image src={row.profiles.avatar_url} alt="" width={32} height={32} className="object-cover h-full w-full" unoptimized />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[10px] font-black text-[var(--color-accent)]">
                    {(row.profiles?.full_name || row.profiles?.username || "?")[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate">{row.profiles?.full_name || row.profiles?.username || "Member"}</p>
                <p className="text-[10px] text-[var(--color-accent)] font-black">{row.total_points} pts</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-3">Your rank updates as you earn points.</p>
      </aside>

      <Dialog open={!!modalTask} onOpenChange={(o) => !o && setModalTask(null)}>
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-surface)] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black !text-[var(--color-text-primary)]">{modalTask?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-text-muted)]">{modalTask?.description}</p>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--color-text-muted)]">What did you do?</label>
            <Textarea value={proofText} onChange={(e) => setProofText(e.target.value)} rows={4} className="rounded-sm border-[var(--color-border)]" />
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Proof link (optional)</label>
            <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} className="rounded-sm border-[var(--color-border)]" placeholder="https://…" />
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-2">
            <Button variant="outline" className="rounded-sm" onClick={() => setModalTask(null)}>
              Cancel
            </Button>
            <Button className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black" disabled={submitting || !proofText.trim()} onClick={submitTask}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Completion"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

