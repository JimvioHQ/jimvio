"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";
import { useUgcBrandWorkspace } from "./UgcBrandWorkspaceProvider";

type Favorite = {
  id: string;
  influencer_id: string;
  notes?: string | null;
  tags?: string[] | null;
  influencer?: {
    id: string;
    display_name?: string | null;
    username?: string | null;
    profile_image?: string | null;
  } | null;
};

type CampaignOption = { id: string; title: string };

export function UGCFavoriteCreatorsPage() {
  const { ugcFetch } = useUgcBrandWorkspace();

  const [rows, setRows] = useState<Favorite[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [inviteCampaign, setInviteCampaign] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fRes, cRes] = await Promise.all([
        ugcFetch("/api/ugc/favorites/creators", { cache: "no-store" }),
        ugcFetch("/api/ugc/campaigns?status=all&mine=1&limit=100", { cache: "no-store" }),
      ]);
      if (fRes.status === 403) {
        setError("Brand account required to manage favorite creators.");
        setRows([]);
        return;
      }
      if (!fRes.ok) throw new Error("load failed");
      const fJson = await fRes.json();
      const list = (fJson.data ?? []) as Favorite[];
      setRows(list);
      setNotesDraft(
        Object.fromEntries(list.map((r) => [r.id, r.notes ?? ""])),
      );
      if (cRes.ok) {
        const cJson = await cRes.json();
        setCampaigns(
          (cJson.data ?? []).map((c: { id: string; title: string }) => ({
            id: c.id,
            title: c.title,
          })),
        );
      }
    } catch {
      setError("Could not load favorite creators.");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveNotes = async (fav: Favorite) => {
    setBusyId(fav.id);
    try {
      const res = await ugcFetch(`/api/ugc/favorites/creators/${fav.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft[fav.id] ?? "" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast.success("Notes saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (influencerId: string) => {
    setBusyId(influencerId);
    try {
      const res = await fetch(
        `/api/ugc/favorites/creators?influencer_id=${encodeURIComponent(influencerId)}`,
        { method: "DELETE" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Remove failed");
      toast.success("Removed from favorites");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusyId(null);
    }
  };

  const invite = async (fav: Favorite) => {
    const campaignId = inviteCampaign[fav.id];
    if (!campaignId) {
      toast.error("Select a campaign first");
      return;
    }
    setBusyId(fav.id);
    try {
      const res = await ugcFetch("/api/ugc/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          influencer_id: fav.influencer_id,
          message: "You're invited to join this campaign.",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Invite failed");
      toast.success("Invitation sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = r.influencer?.display_name ?? "";
    const user = r.influencer?.username ?? "";
    return name.toLowerCase().includes(q) || user.toLowerCase().includes(q);
  });

  return (
    <UGCPageShell
      titleKey="favorites"
      subtitleKey="favoritesSubtitle"
    >
      <UGCFilterBar search={search} onSearchChange={setSearch} />

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <UGCPageEmpty
          title="No favorite creators"
          description="Favorite creators from recruitment to invite them faster."
          illustration="profile"
        />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((fav) => {
            const busy = busyId === fav.id || busyId === fav.influencer_id;
            return (
              <div key={fav.id} className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-bold text-[#111827]">
                      {fav.influencer?.display_name ?? "Creator"}
                    </p>
                    {fav.influencer?.username ? (
                      <p className="text-[12px] text-[#6B7280]">@{fav.influencer.username}</p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={busy}
                    onClick={() => void remove(fav.influencer_id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>

                <label className="mt-3 block text-[12px] font-semibold text-[#374151]">
                  Notes
                  <textarea
                    value={notesDraft[fav.id] ?? ""}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({ ...prev, [fav.id]: e.target.value }))
                    }
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
                  />
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={busy}
                    onClick={() => void saveNotes(fav)}
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save notes
                  </Button>
                  <select
                    value={inviteCampaign[fav.id] ?? ""}
                    onChange={(e) =>
                      setInviteCampaign((prev) => ({ ...prev, [fav.id]: e.target.value }))
                    }
                    className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
                  >
                    <option value="">Select campaign…</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    className="rounded-xl bg-[#FF5A1F] hover:bg-[#E54E18]"
                    disabled={busy}
                    onClick={() => void invite(fav)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Quick invite
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
