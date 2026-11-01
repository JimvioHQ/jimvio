"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, ExternalLink, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { IdentityPortfolioItem, IdentityPortfolioKind } from "@/lib/identity/types";
import { SettingsButton, SettingsCard, SettingsField, settingsInputClass, settingsTextareaClass } from "@/components/settings-center/settings-ui";

type Draft = {
  id?: string;
  kind: IdentityPortfolioKind;
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  externalUrl: string;
  brandName: string;
  isFeatured: boolean;
  isPublic: boolean;
};

const EMPTY: Draft = {
  kind: "other", title: "", description: "", mediaUrl: "", thumbnailUrl: "",
  externalUrl: "", brandName: "", isFeatured: false, isPublic: true,
};

const KINDS: { value: IdentityPortfolioKind; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "image", label: "Image" },
  { value: "campaign", label: "Campaign" },
  { value: "brand", label: "Brand collaboration" },
  { value: "testimonial", label: "Testimonial" },
  { value: "other", label: "Other" },
];

function toDraft(item: IdentityPortfolioItem): Draft {
  return {
    id: item.id, kind: item.kind, title: item.title,
    description: item.description ?? "", mediaUrl: item.mediaUrl ?? "",
    thumbnailUrl: item.thumbnailUrl ?? "", externalUrl: item.externalUrl ?? "",
    brandName: item.brandName ?? "", isFeatured: item.isFeatured, isPublic: item.isPublic,
  };
}

export function IdentityPortfolioManager({ initialItems }: { initialItems: IdentityPortfolioItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/identity/portfolio", { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not load portfolio");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load portfolio");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function save() {
    if (!draft?.title.trim()) {
      toast.error("Add a title for this portfolio item.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/identity/portfolio", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          title: draft.title.trim(),
          description: draft.description.trim(),
          mediaUrl: draft.mediaUrl.trim(),
          thumbnailUrl: draft.thumbnailUrl.trim(),
          externalUrl: draft.externalUrl.trim(),
          brandName: draft.brandName.trim(),
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not save portfolio item");
      toast.success(draft.id ? "Portfolio item updated" : "Portfolio item added");
      setDraft(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save portfolio item");
    } finally { setBusy(false); }
  }

  async function remove(item: IdentityPortfolioItem) {
    if (!window.confirm(`Permanently delete “${item.title}” from your portfolio?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/identity/portfolio?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not delete portfolio item");
      toast.success("Portfolio item deleted");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (draft?.id === item.id) setDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete portfolio item");
    } finally { setBusy(false); }
  }

  async function toggle(item: IdentityPortfolioItem, field: "isPublic" | "isFeatured") {
    setBusy(true);
    try {
      const response = await fetch("/api/identity/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, [field]: !item[field] }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not update portfolio item");
      setItems((current) => current.map((entry) => entry.id === item.id ? json.item : entry));
      toast.success(field === "isPublic" ? (json.item.isPublic ? "Now visible on your profile" : "Hidden from your public profile") : (json.item.isFeatured ? "Featured on your profile" : "Removed from featured"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update portfolio item");
    } finally { setBusy(false); }
  }

  return (
    <SettingsCard title="Portfolio" description="Add work samples and collaborations. Public items appear in the Portfolio tab of your profile." icon={<Briefcase className="h-4 w-4" />}>
      <div className="space-y-4">
        <div className="flex justify-end">
          <SettingsButton type="button" onClick={() => setDraft({ ...EMPTY })}>
            <Plus className="h-4 w-4" /> Add portfolio item
          </SettingsButton>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-[#6B7280]"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading portfolio…</div>
        ) : items.length ? (
          <div className="divide-y divide-[#F1F2F4] rounded-xl border border-[#E5E7EB]">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[#111827]">{item.title}</p>
                    <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">{item.kind}</span>
                  </div>
                  {item.brandName && <p className="mt-0.5 text-xs text-[#6B7280]">{item.brandName}</p>}
                  {item.description && <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">{item.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <button type="button" disabled={busy} onClick={() => void toggle(item, "isPublic")} className="rounded-full border border-[#E5E7EB] px-2.5 py-1 disabled:opacity-50">{item.isPublic ? "Public" : "Private"}</button>
                    <button type="button" disabled={busy} onClick={() => void toggle(item, "isFeatured")} className="rounded-full border border-[#E5E7EB] px-2.5 py-1 disabled:opacity-50">{item.isFeatured ? "Featured" : "Not featured"}</button>
                    {item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#D6480F]"><ExternalLink className="h-3 w-3" /> Open link</a>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" disabled={busy} onClick={() => setDraft(toDraft(item))} className="rounded-full border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#111827] disabled:opacity-50">Edit</button>
                  <button type="button" disabled={busy} onClick={() => void remove(item)} aria-label={`Delete ${item.title}`} className="rounded-full border border-red-100 p-2 text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#D1D5DB] p-6 text-center">
            <Briefcase className="mx-auto h-6 w-6 text-[#9CA3AF]" />
            <p className="mt-2 text-sm font-semibold text-[#111827]">Your portfolio is empty</p>
            <p className="mt-1 text-xs text-[#6B7280]">Add a video, image, campaign, collaboration or testimonial.</p>
          </div>
        )}
        {draft && (
          <div className="space-y-4 rounded-2xl border border-[#FED7C3] bg-[#FFFAF7] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827]">{draft.id ? "Edit portfolio item" : "New portfolio item"}</h3>
              <button type="button" onClick={() => setDraft(null)} aria-label="Close editor" className="rounded-full p-1 text-[#6B7280] hover:bg-black/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingsField label="Type">
                <select className={settingsInputClass} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as IdentityPortfolioKind })}>
                  {KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
                </select>
              </SettingsField>
              <SettingsField label="Title"><input className={settingsInputClass} value={draft.title} maxLength={160} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></SettingsField>
              <SettingsField label="Brand / client"><input className={settingsInputClass} value={draft.brandName} maxLength={120} onChange={(e) => setDraft({ ...draft, brandName: e.target.value })} /></SettingsField>
              <SettingsField label="External link"><input className={settingsInputClass} value={draft.externalUrl} placeholder="https://" inputMode="url" onChange={(e) => setDraft({ ...draft, externalUrl: e.target.value })} /></SettingsField>
              <SettingsField label="Media URL"><input className={settingsInputClass} value={draft.mediaUrl} placeholder="https://" inputMode="url" onChange={(e) => setDraft({ ...draft, mediaUrl: e.target.value })} /></SettingsField>
              <SettingsField label="Thumbnail URL"><input className={settingsInputClass} value={draft.thumbnailUrl} placeholder="https://" inputMode="url" onChange={(e) => setDraft({ ...draft, thumbnailUrl: e.target.value })} /></SettingsField>
              <div className="sm:col-span-2">
                <SettingsField label="Description"><textarea className={settingsTextareaClass} rows={3} value={draft.description} maxLength={1200} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></SettingsField>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-[#374151]">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={draft.isPublic} onChange={(e) => setDraft({ ...draft, isPublic: e.target.checked })} /> Show on public profile</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={draft.isFeatured} onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })} /> Feature this item</label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} className="rounded-full border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#374151]">Cancel</button>
              <SettingsButton type="button" loading={busy} onClick={() => void save()}><Save className="h-4 w-4" /> Save item</SettingsButton>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
