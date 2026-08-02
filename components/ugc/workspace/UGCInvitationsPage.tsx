"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "./UGCPageShell";

type Invitation = {
  id: string;
  campaign_id: string;
  invitee_email?: string | null;
  invitee_username?: string | null;
  status: string;
  message?: string | null;
  created_at: string;
  campaign?: { id: string; title?: string } | null;
};

type CampaignOption = { id: string; title: string };

export function UGCInvitationsPage() {
  const [rows, setRows] = useState<Invitation[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [iRes, cRes] = await Promise.all([
        fetch("/api/ugc/invitations", { cache: "no-store" }),
        fetch("/api/ugc/campaigns?status=all&mine=1&limit=100", { cache: "no-store" }),
      ]);
      if (iRes.status === 403) {
        setError("Brand account required to manage invitations.");
        setRows([]);
        return;
      }
      if (!iRes.ok) throw new Error("load failed");
      const iJson = await iRes.json();
      setRows(iJson.data ?? []);
      if (cRes.ok) {
        const cJson = await cRes.json();
        const list = (cJson.data ?? []) as CampaignOption[];
        setCampaigns(list);
        if (!campaignId && list[0]) setCampaignId(list[0].id);
      }
    } catch {
      setError("Could not load invitations.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendInvite = async () => {
    if (!campaignId) {
      toast.error("Select a campaign");
      return;
    }
    if (!username.trim() && !email.trim()) {
      toast.error("Enter a username or email");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ugc/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          username: username.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Invite failed");
      toast.success("Invitation sent");
      setUsername("");
      setEmail("");
      setMessage("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.invitee_username ?? "").toLowerCase().includes(q) ||
      (r.invitee_email ?? "").toLowerCase().includes(q) ||
      (r.campaign?.title ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <UGCPageShell
      title="Creator Invitations"
      subtitle="Invite creators by username or email and track invitation status."
    >
      <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
        <h2 className="text-[14px] font-bold text-[#111827]">Send invitation</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          >
            <option value="">Select campaign…</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          />
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional message"
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          />
        </div>
        <Button
          className="mt-3 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E18]"
          disabled={busy}
          onClick={() => void sendInvite()}
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send invite
        </Button>
      </div>

      <UGCFilterBar search={search} onSearchChange={setSearch} />

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <UGCPageEmpty
          title="No invitations yet"
          description="Send your first creator invite using the form above."
          illustration="profile"
        />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#EEF0F2] bg-white p-4"
            >
              <div>
                <p className="text-[14px] font-bold text-[#111827]">
                  {inv.invitee_username || inv.invitee_email || "Invitee"}
                </p>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  {inv.campaign?.title ?? "Campaign"} ·{" "}
                  {new Date(inv.created_at).toLocaleDateString()}
                </p>
              </div>
              <UGCStatusPill status={inv.status} />
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
