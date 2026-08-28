"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "@/components/ugc/workspace/UGCPageShell";
import {
  EnterpriseOutlineButton,
  EnterprisePrimaryButton,
  cardClass,
  fieldClass,
} from "./enterprise-ui";
import { useUgcBrandWorkspace } from "@/components/ugc/workspace/UgcBrandWorkspaceProvider";

type Dispute = {
  id: string;
  campaign_id: string;
  reason: string;
  status: string;
  against_role?: string;
  amount_in_dispute?: number | null;
  created_at?: string;
};

type DisputeMessage = {
  id: string;
  body?: string | null;
  created_at?: string;
  sender_user_id?: string;
};

export function DisputesPage() {
  const { ugcFetch } = useUgcBrandWorkspace();

  const [rows, setRows] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [reason, setReason] = useState("");
  const [againstRole, setAgainstRole] = useState("creator");
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/disputes", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load disputes");
      setRows(json.data ?? json.disputes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDispute = async () => {
    if (!campaignId.trim() || !reason.trim()) {
      toast.error("Campaign ID and reason required");
      return;
    }
    setBusy(true);
    try {
      const res = await ugcFetch("/api/ugc/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId.trim(),
          reason: reason.trim(),
          against_role: againstRole,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not open dispute");
      toast.success("Dispute opened");
      setReason("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open dispute");
    } finally {
      setBusy(false);
    }
  };

  const loadMessages = async (id: string) => {
    setActiveId(id);
    try {
      const res = await ugcFetch(`/api/ugc/disputes/${id}/messages`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load messages");
      setMessages(json.data ?? json.messages ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load messages");
    }
  };

  const sendMessage = async () => {
    if (!activeId || !messageBody.trim()) return;
    setBusy(true);
    try {
      const res = await ugcFetch(`/api/ugc/disputes/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageBody.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      setMessageBody("");
      await loadMessages(activeId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UGCPageShell titleKey="disputes" subtitleKey="disputesSubtitle">
      <div className={`${cardClass} grid gap-3 sm:grid-cols-2`}>
        <label className="text-[12px] font-semibold text-[#374151]">
          Campaign ID
          <input className={fieldClass} value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-[#374151]">
          Against
          <select className={fieldClass} value={againstRole} onChange={(e) => setAgainstRole(e.target.value)}>
            <option value="creator">Creator</option>
            <option value="brand">Brand</option>
            <option value="platform">Platform</option>
          </select>
        </label>
        <label className="text-[12px] font-semibold text-[#374151] sm:col-span-2">
          Reason
          <textarea className={`${fieldClass} min-h-[80px]`} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <EnterprisePrimaryButton onClick={() => void openDispute()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Open dispute
        </EnterprisePrimaryButton>
      </div>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <UGCPageEmpty title="No disputes" description="Opened disputes will appear here with message threads." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {rows.map((d) => (
              <div key={d.id} className={cardClass}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#111827]">{d.reason}</p>
                    <p className="mt-1 text-[11px] text-[#6B7280]">Campaign {d.campaign_id}</p>
                  </div>
                  <UGCStatusPill status={d.status} />
                </div>
                <EnterpriseOutlineButton className="mt-3" onClick={() => void loadMessages(d.id)}>
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </EnterpriseOutlineButton>
              </div>
            ))}
          </div>
          <div className={cardClass}>
            <h2 className="text-sm font-bold text-[#111827]">
              {activeId ? "Thread" : "Select a dispute"}
            </h2>
            {activeId ? (
              <>
                <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-[13px] text-[#6B7280]">No messages yet.</p>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm text-[#111827]">
                        {m.body}
                        {m.created_at ? (
                          <p className="mt-1 text-[10px] text-[#9CA3AF]">
                            {new Date(m.created_at).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    className={fieldClass}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Write a message…"
                  />
                  <EnterprisePrimaryButton onClick={() => void sendMessage()} disabled={busy}>
                    Send
                  </EnterprisePrimaryButton>
                </div>
              </>
            ) : (
              <p className="mt-2 text-[13px] text-[#6B7280]">Choose Messages on a dispute to load the thread.</p>
            )}
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
