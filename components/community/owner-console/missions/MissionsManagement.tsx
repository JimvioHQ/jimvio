"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasCapability } from "@/lib/community/workspace/permissions";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";

type Mission = {
  id: string;
  title: string;
  status?: string;
  visibility?: string;
  points?: number;
  completion_count?: number;
  participant_status?: string;
};

export function MissionsManagement() {
  const { community, role } = useOwnerConsole();
  const canManage = hasCapability(role, "channel.manage");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions: "",
    completionCriteria: "",
    visibility: "community",
    status: "draft",
    submissionKind: "text",
    reviewMode: "review",
    rewardType: "points",
    points: "10",
    endsAt: "",
  });

  const load = useCallback(async () => {
    if (!community?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/c/missions?manage=1&communityId=${encodeURIComponent(community.id)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not load missions");
      setMissions(json.missions ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load missions");
    } finally {
      setLoading(false);
    }
  }, [community?.id]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!community?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/c/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: community.id,
          ...form,
          points: Number(form.points || 0),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save mission");
      toast.success("Mission saved");
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save mission");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) return <p className="text-sm text-[var(--color-text-muted)]">You do not have permission to manage missions.</p>;

  const published = missions.filter((mission) => mission.status === "published").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[#6B7280]">{missions.length} missions · {published} published. Counts come from saved missions.</p>
        <Button type="button" size="sm" className="rounded-xl bg-[#FF5A1F]" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" /> New mission
        </Button>
      </div>
      {showForm ? (
        <div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2">
          <label className="sm:col-span-2 text-[12px] font-semibold">Title<Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="sm:col-span-2 text-[12px] font-semibold">Description<Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="sm:col-span-2 text-[12px] font-semibold">Instructions<Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></label>
          <label className="sm:col-span-2 text-[12px] font-semibold">Completion criteria<Input value={form.completionCriteria} onChange={(e) => setForm({ ...form, completionCriteria: e.target.value })} /></label>
          <label className="text-[12px] font-semibold">Visibility
            <select className="mt-1 h-10 w-full rounded-md border px-3 text-sm" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              <option value="community">Community</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label className="text-[12px] font-semibold">Status
            <select className="mt-1 h-10 w-full rounded-md border px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="text-[12px] font-semibold">Submission
            <select className="mt-1 h-10 w-full rounded-md border px-3 text-sm" value={form.submissionKind} onChange={(e) => setForm({ ...form, submissionKind: e.target.value, reviewMode: e.target.value === "none" ? form.reviewMode : "review" })}>
              <option value="text">Text</option>
              <option value="link">Link</option>
              <option value="file">File link</option>
              <option value="none">No evidence</option>
            </select>
          </label>
          <label className="text-[12px] font-semibold">Review
            <select className="mt-1 h-10 w-full rounded-md border px-3 text-sm" value={form.reviewMode} onChange={(e) => setForm({ ...form, reviewMode: e.target.value })}>
              <option value="review">Organizer review</option>
              <option value="auto">Automatic</option>
            </select>
          </label>
          <label className="text-[12px] font-semibold">Reward
            <select className="mt-1 h-10 w-full rounded-md border px-3 text-sm" value={form.rewardType} onChange={(e) => setForm({ ...form, rewardType: e.target.value })}>
              <option value="points">Points</option>
              <option value="none">None</option>
            </select>
          </label>
          <label className="text-[12px] font-semibold">Points<Input value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></label>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="button" disabled={saving} className="bg-[#FF5A1F]" onClick={() => void save()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save mission"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      ) : null}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : missions.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-6 py-12 text-center">
          <p className="font-semibold">No missions yet</p>
          <p className="mt-1 text-sm text-[#6B7280]">Create a challenge for members. Points are recorded only after an allowed completion.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {missions.map((mission) => (
            <li key={mission.id} className="rounded-2xl border bg-white p-4">
              <p className="text-[11px] font-bold uppercase text-[#FF5A1F]">{mission.status} · {mission.visibility}</p>
              <h3 className="font-bold">{mission.title}</h3>
              <p className="text-[12px] text-[#6B7280]">{mission.points || 0} pts · {mission.completion_count || 0} recorded completions</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
