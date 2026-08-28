"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Pin, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "@/components/ugc/workspace/UGCPageShell";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  body?: string | null;
  message_type?: string;
  attachment_url?: string | null;
  is_pinned?: boolean;
  sender_user_id: string;
  created_at: string;
};

type Thread = {
  id: string;
  campaign_id: string;
  influencer_id: string;
  role?: "brand" | "creator";
};

export function CampaignChatPage({ campaignId }: { campaignId: string }) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [voiceUrl, setVoiceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [influencerId, setInfluencerId] = useState("");
  const [participants, setParticipants] = useState<
    Array<{ influencer_id: string; display_name?: string }>
  >([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async (threadId: string) => {
    const res = await fetch(`/api/ugc/chat/threads/${threadId}/messages`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("messages failed");
    const json = await res.json();
    setMessages(json.data ?? json.messages ?? []);
  }, []);

  const ensureThread = useCallback(
    async (infId: string) => {
      const res = await fetch("/api/ugc/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, influencer_id: infId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not open thread");
      const t = (json.thread ?? json.data) as Thread;
      setThread({ ...t, role: json.role ?? t.role });
      await loadMessages(t.id);
      return t;
    },
    [campaignId, loadMessages],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [threadsRes, partsRes, campRes] = await Promise.all([
        fetch("/api/ugc/chat/threads", { cache: "no-store" }),
        fetch(`/api/ugc/campaigns/${campaignId}/participants`, { cache: "no-store" }),
        fetch(`/api/ugc/campaigns/${campaignId}/participant`, { cache: "no-store" }),
      ]);

      let myInfluencerId: string | null = null;
      let isBrandView = false;
      if (campRes.ok) {
        const pJson = await campRes.json();
        myInfluencerId = pJson.participant?.influencer_id ?? null;
      }

      if (partsRes.ok) {
        const pJson = await partsRes.json();
        const list = (pJson.data ?? pJson.participants ?? []).map(
          (p: {
            influencer_id: string;
            influencer?: { display_name?: string };
          }) => ({
            influencer_id: p.influencer_id,
            display_name: p.influencer?.display_name,
          }),
        );
        setParticipants(list);
        if (list.length > 0 && !myInfluencerId) isBrandView = true;
      }

      // Creator path: resolve influencer id from existing campaign threads if needed
      let existing: Thread | null = null;
      if (threadsRes.ok) {
        const tJson = await threadsRes.json();
        const threads = (tJson.data ?? tJson.threads ?? []) as Thread[];
        const forCampaign = threads.filter((t) => t.campaign_id === campaignId);
        if (myInfluencerId) {
          existing =
            forCampaign.find((t) => t.influencer_id === myInfluencerId) ?? null;
        } else if (forCampaign.length === 1) {
          existing = forCampaign[0] ?? null;
          myInfluencerId = existing?.influencer_id ?? null;
        } else if (forCampaign.length > 1) {
          isBrandView = true;
        }
      }

      if (myInfluencerId && !isBrandView) {
        setInfluencerId(myInfluencerId);
        await ensureThread(myInfluencerId);
      } else if (existing && !isBrandView) {
        setInfluencerId(existing.influencer_id);
        setThread(existing);
        await loadMessages(existing.id);
      } else {
        setThread(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load chat.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, ensureThread, loadMessages]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!thread) {
      if (!influencerId) {
        toast.error("Select a creator to chat with");
        return;
      }
      try {
        await ensureThread(influencerId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not open thread");
        return;
      }
    }
    const active = thread;
    if (!active && !influencerId) return;

    const tid = active?.id;
    setBusy(true);
    try {
      let threadId = tid;
      if (!threadId) {
        const t = await ensureThread(influencerId);
        threadId = t.id;
      }

      const payload: Record<string, unknown> = {};
      if (voiceUrl.trim()) {
        payload.message_type = "voice";
        payload.attachment_url = voiceUrl.trim();
        payload.body = body.trim() || "Voice note";
      } else if (attachmentUrl.trim()) {
        payload.message_type = "attachment";
        payload.attachment_url = attachmentUrl.trim();
        payload.body = body.trim() || "Attachment";
      } else {
        if (!body.trim()) {
          toast.error("Enter a message");
          setBusy(false);
          return;
        }
        payload.message_type = "text";
        payload.body = body.trim();
      }

      const res = await fetch(`/api/ugc/chat/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      setBody("");
      setAttachmentUrl("");
      setVoiceUrl("");
      await loadMessages(threadId!);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (msg: Message) => {
    try {
      const res = await fetch(`/api/ugc/chat/messages/${msg.id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: !msg.is_pinned }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Pin failed");
      if (thread) await loadMessages(thread.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pin failed");
    }
  };

  return (
    <UGCPageShell
      titleKey="campaignChat"
      subtitleKey="chatSubtitle"
      actions={
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link href={`/ugc/${campaignId}`}>Campaign page</Link>
        </Button>
      }
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {participants.length > 0 ? (
            <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-3">
              <label className="text-[12px] font-semibold text-[#374151]">
                Chat with creator
                <select
                  value={influencerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setInfluencerId(id);
                    if (id) void ensureThread(id).catch(() => undefined);
                  }}
                  className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
                >
                  <option value="">Select creator…</option>
                  {participants.map((p) => (
                    <option key={p.influencer_id} value={p.influencer_id}>
                      {p.display_name || p.influencer_id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <div className="flex min-h-[420px] flex-col rounded-[16px] border border-[#EEF0F2] bg-white">
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <UGCPageEmpty
                  title="No messages yet"
                  description="Send the first message, attach a URL, or share a voice note link."
                />
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-xl border px-3 py-2",
                      m.is_pinned
                        ? "border-amber-200 bg-amber-50"
                        : "border-[#F3F4F6] bg-[#FAFAFA]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">
                          {m.message_type ?? "text"} ·{" "}
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                        {m.body ? (
                          <p className="mt-1 text-[13px] text-[#111827]">{m.body}</p>
                        ) : null}
                        {m.attachment_url ? (
                          <a
                            href={m.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block truncate text-[12px] font-semibold text-[#FF5A1F]"
                          >
                            {m.attachment_url}
                          </a>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => void togglePin(m)}
                        className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-white hover:text-[#FF5A1F]"
                        aria-label="Pin message"
                      >
                        <Pin className={cn("h-4 w-4", m.is_pinned && "text-amber-600")} />
                      </button>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="space-y-2 border-t border-[#F3F4F6] p-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                placeholder="Write a message…"
                className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="Attachment URL (optional)"
                  className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
                />
                <input
                  value={voiceUrl}
                  onChange={(e) => setVoiceUrl(e.target.value)}
                  placeholder="Voice note URL (optional)"
                  className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
                />
              </div>
              <Button
                className="rounded-xl bg-[#FF5A1F] hover:bg-[#E54E18]"
                disabled={busy}
                onClick={() => void send()}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
