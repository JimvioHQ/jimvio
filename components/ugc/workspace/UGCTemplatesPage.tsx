"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getTemplates,
  type UGCTemplate,
} from "@/lib/ugc/templates-storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";
import { useUgcBrandWorkspace } from "./UgcBrandWorkspaceProvider";

type CampaignTemplate = {
  id: string;
  name: string;
  description?: string | null;
  is_favorite?: boolean;
  use_count?: number;
  updated_at?: string;
  source_campaign_id?: string | null;
};

export function UGCTemplatesPage() {
  const { ugcFetch } = useUgcBrandWorkspace();

  const router = useRouter();
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [legacy, setLegacy] = useState<UGCTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/templates", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setTemplates(json.data ?? []);
    } catch {
      setError("Could not load campaign templates.");
    } finally {
      setLoading(false);
      setLegacy(getTemplates());
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (favoritesOnly && !t.is_favorite) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [templates, search, favoritesOnly]);

  const toggleFavorite = async (t: CampaignTemplate) => {
    setBusyId(t.id);
    try {
      const res = await ugcFetch(`/api/ugc/templates/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !t.is_favorite }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    setBusyId(id);
    try {
      const res = await ugcFetch(`/api/ugc/templates/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast.success("Template deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const applyTemplate = async (id: string) => {
    setBusyId(id);
    try {
      const res = await ugcFetch(`/api/ugc/templates/${id}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not use template");
      toast.success("Draft created from template");
      router.push(json.redirectTo || `/ugc/campaign-center/create?duplicate=${json.campaign?.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not use template");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <UGCPageShell
      titleKey="templates"
      subtitleKey="templatesSubtitle"
    >
      <UGCFilterBar search={search} onSearchChange={setSearch}>
        <button
          type="button"
          onClick={() => setFavoritesOnly((f) => !f)}
          className={cn(
            "rounded-xl border px-3 py-2 text-sm font-semibold",
            favoritesOnly
              ? "border-[#FF5A1F] bg-[#FFF4EF] text-[#FF5A1F]"
              : "border-[#E5E7EB] text-[#374151]",
          )}
        >
          Favorites
        </button>
      </UGCFilterBar>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <UGCPageEmpty
          title="No campaign templates"
          description="Save a campaign as a template from Campaign Management, then reuse it here."
          illustration="campaigns"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <a href="/ugc/campaign-center">Open Campaign Center</a>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((t) => {
            const busy = busyId === t.id;
            return (
              <div key={t.id} className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#FF5A1F]">
                      Used {t.use_count ?? 0}×
                    </p>
                    <h3 className="text-[14px] font-bold text-[#111827]">{t.name}</h3>
                    {t.description ? (
                      <p className="mt-1 line-clamp-2 text-[13px] text-[#6B7280]">
                        {t.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleFavorite(t)}
                    aria-label="Toggle favorite"
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        t.is_favorite ? "fill-amber-400 text-amber-400" : "text-[#D1D5DB]",
                      )}
                    />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="rounded-xl bg-[#FF5A1F] hover:bg-[#E54E18]"
                    disabled={busy}
                    onClick={() => void applyTemplate(t.id)}
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Use template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={busy}
                    onClick={() => void remove(t.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {legacy.length > 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-4">
          <h2 className="text-[13px] font-bold text-[#111827]">Legacy content snippets</h2>
          <p className="mt-1 text-[12px] text-[#6B7280]">
            Local hooks and captions stored in this browser (not synced).
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {legacy.slice(0, 6).map((t) => (
              <div key={t.id} className="rounded-xl border border-[#EEF0F2] bg-white p-3">
                <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">{t.category}</p>
                <p className="text-[13px] font-semibold text-[#111827]">{t.title}</p>
                <p className="mt-1 line-clamp-2 text-[12px] text-[#6B7280]">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
