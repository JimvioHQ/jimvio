"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkX, FolderPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

type Collection = { id: string; name: string };
type SavedRow = {
  id: string;
  campaign_id: string;
  collection_id?: string | null;
  created_at: string;
  campaign?: {
    id: string;
    title: string;
    status?: string;
    campaign_type?: string;
  } | null;
};

export function UGCSavedCampaignsPage() {
  const [saves, setSaves] = useState<SavedRow[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [newCollection, setNewCollection] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch("/api/ugc/saves", { cache: "no-store" }),
        fetch("/api/ugc/saves/collections", { cache: "no-store" }),
      ]);
      if (!sRes.ok) throw new Error("load failed");
      const sJson = await sRes.json();
      setSaves(sJson.data ?? sJson.saves ?? []);
      if (cRes.ok) {
        const cJson = await cRes.json();
        setCollections(cJson.data ?? cJson.collections ?? []);
      }
    } catch {
      setError("Could not load saved campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createCollection = async () => {
    if (!newCollection.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ugc/saves/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCollection.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setNewCollection("");
      toast.success("Collection created");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const removeSave = async (campaignId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/ugc/saves?campaign_id=${encodeURIComponent(campaignId)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Remove failed");
      toast.success("Removed from saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm("Delete this collection?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ugc/saves/collections/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast.success("Collection deleted");
      if (collectionFilter === id) setCollectionFilter("all");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const filtered = saves.filter((s) => {
    if (collectionFilter !== "all" && s.collection_id !== collectionFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (s.campaign?.title ?? "").toLowerCase().includes(q);
  });

  return (
    <UGCPageShell
      titleKey="saved"
      subtitleKey="savedSubtitle"
    >
      <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
        <h2 className="text-[14px] font-bold text-[#111827]">Collections</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newCollection}
            onChange={(e) => setNewCollection(e.target.value)}
            placeholder="New collection name"
            className="min-w-[180px] flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          />
          <Button
            disabled={busy}
            onClick={() => void createCollection()}
            className="rounded-xl bg-[#FF5A1F] hover:bg-[#E54E18]"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </div>
        {collections.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {collections.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCollectionFilter((prev) => (prev === c.id ? "all" : c.id))}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                  collectionFilter === c.id
                    ? "border-[#FF5A1F] bg-[#FFF4EF] text-[#FF5A1F]"
                    : "border-[#E5E7EB] text-[#374151]"
                }`}
              >
                {c.name}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteCollection(c.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      void deleteCollection(c.id);
                    }
                  }}
                  className="text-[#9CA3AF] hover:text-rose-600"
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <UGCFilterBar search={search} onSearchChange={setSearch}>
        <select
          value={collectionFilter}
          onChange={(e) => setCollectionFilter(e.target.value)}
          className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
        >
          <option value="all">All collections</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </UGCFilterBar>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <UGCPageEmpty
          title="No saved campaigns"
          description="Bookmark campaigns from Discover to build your shortlist."
          illustration="campaigns"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc">
                <Plus className="mr-2 h-4 w-4" />
                Discover campaigns
              </Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#EEF0F2] bg-white p-4"
            >
              <div>
                <Link
                  href={`/ugc/${s.campaign_id}`}
                  className="text-[14px] font-bold text-[#111827] hover:text-[#FF5A1F]"
                >
                  {s.campaign?.title ?? "Campaign"}
                </Link>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Saved {new Date(s.created_at).toLocaleDateString()}
                  {s.campaign?.status ? ` · ${s.campaign.status}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={busy}
                onClick={() => void removeSave(s.campaign_id)}
              >
                <BookmarkX className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
