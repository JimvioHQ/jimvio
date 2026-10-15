"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";

export default function MissionDetailPage() {
  const params = useParams<{ missionId: string }>();
  const [mission, setMission] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submissions, setSubmissions] = useState<Array<Record<string, any>>>([]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/c/missions/${params.missionId}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error || "Mission unavailable");
    else {
      setMission(json.mission);
      setError(null);
      if (json.mission?.can_manage) {
        const review = await fetch(`/api/c/missions/${params.missionId}?submissions=1`);
        const reviewJson = await review.json().catch(() => ({}));
        if (review.ok) setSubmissions(reviewJson.submissions ?? []);
      }
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [params.missionId]);

  async function submit() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/c/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", missionId: params.missionId, text, url }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error || "Could not submit");
      return;
    }
    setMessage(`Status: ${json.submission?.status}`);
    await load();
  }

  async function review(participantId: string, decision: "approved" | "rejected") {
    const feedback = window.prompt("Optional feedback") ?? "";
    const res = await fetch(`/api/c/missions/${params.missionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, decision, feedback }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error || "Review failed");
      return;
    }
    await load();
  }

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error || !mission) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center"><p className="font-bold">Mission unavailable</p><p className="mt-2 text-sm text-zinc-500">{error}</p><HubLinkButton href="/communities/missions" className="mt-4">Back</HubLinkButton></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <HubCard>
        <p className="text-[11px] font-bold uppercase text-[#fd5000]">{mission.community_name} · {mission.visibility}</p>
        <h1 className="mt-1 text-2xl font-black">{mission.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm">{mission.description}</p>
        {mission.instructions ? <p className="mt-3 text-sm"><strong>Instructions. </strong>{mission.instructions}</p> : null}
        {mission.completion_criteria ? <p className="mt-2 text-sm"><strong>Done when. </strong>{mission.completion_criteria}</p> : null}
        <p className="mt-3 text-sm">Status: {mission.participant_status || "not started"} · {mission.reward_type === "none" ? "No points reward" : `${mission.points} points after approval`}</p>
        {mission.due_date ? <p className="text-sm">Ends {new Date(mission.due_date).toLocaleString()}</p> : null}
        {mission.submission?.feedback ? <p className="mt-2 text-sm">Reviewer feedback: {mission.submission.feedback}</p> : null}
        {message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
        {mission.submission_kind !== "none" ? (
          <div className="mt-4 space-y-2">
            {mission.submission_kind === "text" ? <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Describe what you completed" /> : null}
            {mission.submission_kind !== "text" ? <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="https:// evidence link" /> : null}
          </div>
        ) : null}
        <button type="button" disabled={busy} onClick={() => void submit()} className="mt-4 rounded-full bg-[#fd5000] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {mission.submission_kind === "none" ? "Complete mission" : "Submit"}
        </button>
      </HubCard>
      {mission.can_manage ? (
        <HubCard>
          <h2 className="font-bold">Submissions</h2>
          {submissions.length === 0 ? <p className="mt-2 text-sm text-zinc-500">No submissions yet.</p> : (
            <ul className="mt-3 space-y-3">
              {submissions.map((row) => (
                <li key={row.id} className="rounded-xl border p-3 text-sm">
                  <p>{row.status} · {row.proof_text || row.proof_url || row.file_url || "Joined"}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="rounded-full bg-[#fd5000] px-3 py-1 text-xs font-semibold text-white" onClick={() => void review(row.user_id, "approved")}>Approve</button>
                    <button type="button" className="rounded-full border px-3 py-1 text-xs font-semibold" onClick={() => void review(row.user_id, "rejected")}>Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </HubCard>
      ) : null}
    </div>
  );
}
