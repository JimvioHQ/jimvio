"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Play, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { UGCPageError, UGCPageLoading, UGCPageShell } from "@/components/ugc/workspace/UGCPageShell";

type SubmissionRow = {
  id: string;
  campaign_id: string;
  influencer_id: string;
  post_url: string;
  platform: string;
  caption?: string | null;
  status: "pending" | "approved" | "rejected" | "removed" | "revision_requested";
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  media?: Array<{
    type?: string;
    url: string;
    thumbnail_url?: string | null;
  }>;
  influencer?: {
    id: string;
    display_name: string;
    profile_image: string | null;
    user_id: string;
  } | null;
};

type ModalMode = "reject" | "revision";

const modalTitle: Record<ModalMode, string> = {
  reject: "Reject submission",
  revision: "Request revision",
};

function statusTone(status: SubmissionRow["status"]) {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending" || status === "revision_requested") return "warning";
  return "neutral";
}

function chatKey(campaignId: string, submissionId: string) {
  return `ugc-brand-chat-note:${campaignId}:${submissionId}`;
}

export default function CampaignSubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = String(id ?? "");
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>("reject");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmissionId, setModalSubmissionId] = useState<string | null>(null);
  const [modalReason, setModalReason] = useState("");

  const [internalNotes, setInternalNotes] = useState<Record<string, string>>({});
  const [noteIds, setNoteIds] = useState<Record<string, string>>({});
  const [chatNotes, setChatNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const sp = new URLSearchParams({ campaignId });
      if (statusFilter !== "all") sp.set("status", statusFilter);
      const res = await fetch(`/api/ugc/submissions?${sp.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load submissions");
      const list = (json.data ?? []) as SubmissionRow[];
      setSubmissions(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [campaignId, statusFilter]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ugc/notes?campaign_id=${campaignId}&scope=brand`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const nextNotes: Record<string, string> = {};
        const nextIds: Record<string, string> = {};
        for (const note of json.data ?? []) {
          const sid = note.submission_id as string | null;
          if (sid) {
            nextNotes[sid] = String(note.body ?? "");
            nextIds[sid] = String(note.id);
          }
        }
        setInternalNotes(nextNotes);
        setNoteIds(nextIds);
      } catch {
        /* keep empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  useEffect(() => {
    if (typeof window === "undefined" || !campaignId) return;
    const nextChats: Record<string, string> = {};
    for (const s of submissions) {
      try {
        nextChats[s.id] = localStorage.getItem(chatKey(campaignId, s.id)) ?? "";
      } catch {
        nextChats[s.id] = "";
      }
    }
    setChatNotes(nextChats);
  }, [campaignId, submissions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) => (s.influencer?.display_name ?? "").toLowerCase().includes(q));
  }, [search, submissions]);

  const approve = useCallback(
    async (submissionId: string) => {
      setBusy(submissionId);
      try {
        const res = await fetch(`/api/ugc/submissions/${submissionId}/approve`, { method: "PATCH" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Approval failed");
        toast.success("Submission approved");
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Approval failed");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const openModal = useCallback((mode: ModalMode, submissionId: string) => {
    setModalMode(mode);
    setModalSubmissionId(submissionId);
    setModalReason("");
    setModalOpen(true);
  }, []);

  const submitRejection = useCallback(async () => {
    if (!modalSubmissionId) return;
    setBusy(modalSubmissionId);
    try {
      if (modalMode === "revision") {
        const res = await fetch(`/api/ugc/submissions/${modalSubmissionId}/revision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: modalReason.trim() || "Please revise this submission.",
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Revision request failed");
        toast.success("Revision requested");
      } else {
        const reason = modalReason.trim()
          ? modalReason.trim()
          : "Does not meet campaign requirements";
        const res = await fetch(`/api/ugc/submissions/${modalSubmissionId}/reject`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Rejection failed");
        toast.success("Submission rejected");
      }
      setModalOpen(false);
      setModalSubmissionId(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }, [load, modalMode, modalReason, modalSubmissionId]);

  const modalBusy = Boolean(busy && modalSubmissionId && busy === modalSubmissionId);

  if (loading) {
    return (
      <UGCPageShell titleKey="submissionReview" subtitle="Loading review queue…">
        <UGCPageLoading />
      </UGCPageShell>
    );
  }

  if (!campaignId) {
    return (
      <UGCPageError
        message="Campaign not found"
        onRetry={() => {
          /* no-op */
        }}
      />
    );
  }

  return (
    <UGCPageShell
      titleKey="submissionReview"
      subtitle="Preview creator content, approve, reject, or request revisions."
      actions={
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link href="/ugc/campaign-center">Back to Campaign Center</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">Content Pipeline</p>
              <h2 className="mt-1 text-[18px] font-bold text-[#111827]">Review Queue</h2>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                {submissions.filter((s) => s.status === "pending").length} pending ·{" "}
                {submissions.filter((s) => s.status === "approved").length} approved
              </p>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["pending", "approved", "rejected", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize",
                    statusFilter === s ? "bg-[#FF5A1F] text-white" : "bg-[#F3F4F6] text-[#374151]",
                  )}
                >
                  {s}
                </button>
              ))}

              <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search creators…"
                  className="h-10 w-full rounded-xl border border-[#E5E7EB] pl-9 pr-3 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white p-10 text-center">
            <p className="text-[14px] font-semibold text-[#111827]">No submissions in this view</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">Try another filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const media = s.media?.[0];
              const noteValue = internalNotes[s.id] ?? "";
              const chatValue = chatNotes[s.id] ?? "";
              const isBusy = busy === s.id;

              return (
                <div key={s.id} className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] overflow-hidden grid place-items-center shrink-0">
                        {s.influencer?.profile_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.influencer.profile_image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-bold text-[#374151]">{(s.influencer?.display_name ?? "C").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-[#111827]">{s.influencer?.display_name ?? "Creator"}</p>
                        <p className="mt-0.5 text-[12px] text-[#6B7280]">
                          {s.platform} ·{" "}
                          {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                        </p>
                        {s.caption ? (
                          <p className="mt-2 line-clamp-2 text-[13px] text-[#4B5563]">{s.caption}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Pill tone={statusTone(s.status)}>{s.status}</Pill>
                      {s.reviewed_at ? (
                        <Pill tone="neutral">Reviewed {new Date(s.reviewed_at).toLocaleDateString()}</Pill>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Video preview</p>
                        <a
                          href={s.post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] font-semibold text-[#FF5A1F] hover:underline"
                        >
                          Open link
                        </a>
                      </div>

                      {media?.url && (media.type === "video" || media.type === "file" || s.platform === "youtube") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <video src={media.url} controls className="mt-3 w-full rounded-xl border border-[#E5E7EB] bg-white" />
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-[#E5E7EB] bg-white p-4 text-center">
                          <Play className="mx-auto h-5 w-5 text-[#FF5A1F]" />
                          <p className="mt-2 text-[13px] font-semibold text-[#111827]">No media preview available</p>
                          <p className="mt-1 text-[12px] text-[#6B7280]">We’ll use the content URL for review.</p>
                        </div>
                      )}

                      {s.rejection_reason ? (
                        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">
                          Rejection: {s.rejection_reason}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Internal notes</p>
                        <textarea
                          value={noteValue}
                          onChange={(e) => {
                            const v = e.target.value;
                            setInternalNotes((prev) => ({ ...prev, [s.id]: v }));
                          }}
                          onBlur={() => {
                            const body = (internalNotes[s.id] ?? "").trim();
                            const existingId = noteIds[s.id];
                            void (async () => {
                              try {
                                if (!body) return;
                                if (existingId) {
                                  await fetch("/api/ugc/notes", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: existingId, body }),
                                  });
                                  return;
                                }
                                if (!body) return;
                                const res = await fetch("/api/ugc/notes", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    campaign_id: campaignId,
                                    submission_id: s.id,
                                    scope: "submission",
                                    body,
                                  }),
                                });
                                const json = await res.json().catch(() => ({}));
                                if (json.note?.id) {
                                  setNoteIds((prev) => ({ ...prev, [s.id]: json.note.id }));
                                }
                              } catch {
                                /* ignore */
                              }
                            })();
                          }}
                          rows={3}
                          className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm"
                          placeholder="Add review notes (guidelines, edits needed, best practices)…"
                        />
                      </div>

                      <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Creator chat (draft)</p>
                        <textarea
                          value={chatValue}
                          onChange={(e) => {
                            const v = e.target.value;
                            setChatNotes((prev) => ({ ...prev, [s.id]: v }));
                            try {
                              localStorage.setItem(chatKey(campaignId, s.id), v);
                            } catch {
                              /* ignore */
                            }
                          }}
                          rows={2}
                          className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm"
                          placeholder="Draft a message to the creator (stored locally for now)…"
                        />
                        <p className="mt-2 text-[12px] text-[#6B7280]">
                          Draft notes stay local.{" "}
                          <Link
                            href={`/ugc/${campaignId}/chat`}
                            className="font-semibold text-[#FF5A1F] hover:underline"
                          >
                            Open campaign chat
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                            disabled={isBusy}
                            onClick={() => void approve(s.id)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={isBusy}
                            onClick={() => openModal("revision", s.id)}
                          >
                            Request revision
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-xl"
                            disabled={isBusy}
                            onClick={() => openModal("reject", s.id)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>

                    <div className="text-[12px] text-[#6B7280]">
                      {s.reviewed_at ? `Last reviewed: ${new Date(s.reviewed_at).toLocaleString()}` : "Not reviewed yet"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modalOpen && modalSubmissionId ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-[24px] border border-[#EEF0F2] bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-bold text-[#111827]">{modalTitle[modalMode]}</h3>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    Add a clear reason so the creator can improve.
                  </p>
                </div>
                <button
                  type="button"
                  className="h-9 w-9 rounded-full border border-[#E5E7EB] hover:bg-[#F9FAFB]"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close modal"
                >
                  <X className="mx-auto h-4 w-4 text-[#6B7280]" />
                </button>
              </div>

              <textarea
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                rows={4}
                className="mt-4 w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm"
                placeholder={modalMode === "revision" ? "What should the creator revise?" : "Rejection reason…"}
              />

              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl flex-1"
                  disabled={modalBusy}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl flex-1 bg-[#FF5A1F] hover:bg-[#E54E18]"
                  disabled={modalBusy}
                  onClick={() => void submitRejection()}
                >
                  {modalBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </UGCPageShell>
  );
}

