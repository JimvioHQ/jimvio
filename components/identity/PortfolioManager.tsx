"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { IdentityPortfolioItem, IdentityPortfolioKind } from "@/lib/identity/types";

const kinds: IdentityPortfolioKind[] = ["video", "image", "campaign", "brand", "testimonial", "other"];
type Draft = { kind: IdentityPortfolioKind; title: string; description: string; mediaUrl: string; thumbnailUrl: string; externalUrl: string; brandName: string; isFeatured: boolean; isPublic: boolean };
const empty: Draft = { kind: "video", title: "", description: "", mediaUrl: "", thumbnailUrl: "", externalUrl: "", brandName: "", isFeatured: false, isPublic: true };
const field = "w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#FF5A1F]";

export function PortfolioManager() {
  const [items, setItems] = useState<IdentityPortfolioItem[]>([]);
  const [draft, setDraft] = useState<Draft>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/identity/portfolio", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load portfolio");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load portfolio"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/identity/portfolio", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editing ? { id: editing } : {}), ...draft, title: draft.title.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save portfolio item");
      setDraft(empty); setEditing(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save portfolio item"); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this portfolio item?")) return;
    try {
      const response = await fetch(`/api/identity/portfolio?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete item");
      setItems((current) => current.filter((item) => item.id !== id));
      if (editing === id) { setEditing(null); setDraft(empty); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete item"); }
  }

  return <div className="space-y-4">
    <div><p className="text-[13px] font-semibold text-[#111827]">Your portfolio</p><p className="text-[12px] text-[#6B7280]">Manage the work displayed on your public profile.</p></div>
    {loading ? <p className="py-3 text-[13px] text-[#6B7280]">Loading portfolio…</p> : items.length ? <ul className="divide-y divide-[#F3F4F6] rounded-xl border border-[#E5E7EB]">
      {items.map((item) => <li key={item.id} className="flex items-center gap-3 p-3">
        {item.thumbnailUrl || item.mediaUrl ? <img src={item.thumbnailUrl || item.mediaUrl || ""} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="h-11 w-11 rounded-lg bg-[#FFF1EA]" />}
        <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{item.title}</p><p className="text-[11px] text-[#6B7280]">{item.kind} · {item.isPublic ? "Public" : "Hidden"}{item.isFeatured ? " · Featured" : ""}</p></div>
        <button type="button" aria-label={`Edit ${item.title}`} onClick={() => { setEditing(item.id); setDraft({ kind: item.kind, title: item.title, description: item.description ?? "", mediaUrl: item.mediaUrl ?? "", thumbnailUrl: item.thumbnailUrl ?? "", externalUrl: item.externalUrl ?? "", brandName: item.brandName ?? "", isFeatured: item.isFeatured, isPublic: item.isPublic }); }} className="rounded-lg p-2 hover:bg-gray-100"><Pencil className="h-4 w-4" /></button>
        <button type="button" aria-label={`Delete ${item.title}`} onClick={() => void remove(item.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
      </li>)}
    </ul> : <p className="rounded-xl bg-[#F9FAFB] p-3 text-[13px] text-[#6B7280]">No portfolio items yet. Add your best work below.</p>}
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
      <p className="text-[13px] font-semibold">{editing ? "Edit portfolio item" : "Add portfolio item"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[12px] font-medium">Type<select className={field} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as IdentityPortfolioKind })}>{kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label>
        <label className="text-[12px] font-medium">Title *<input className={field} required maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
        <label className="text-[12px] font-medium">Media URL<input className={field} type="url" placeholder="https://" value={draft.mediaUrl} onChange={(e) => setDraft({ ...draft, mediaUrl: e.target.value })} /></label>
        <label className="text-[12px] font-medium">Thumbnail URL<input className={field} type="url" placeholder="https://" value={draft.thumbnailUrl} onChange={(e) => setDraft({ ...draft, thumbnailUrl: e.target.value })} /></label>
        <label className="text-[12px] font-medium">External link<input className={field} type="url" placeholder="https://" value={draft.externalUrl} onChange={(e) => setDraft({ ...draft, externalUrl: e.target.value })} /></label>
        <label className="text-[12px] font-medium">Brand name<input className={field} value={draft.brandName} onChange={(e) => setDraft({ ...draft, brandName: e.target.value })} /></label>
      </div>
      <label className="block text-[12px] font-medium">Description<textarea className={field} rows={3} maxLength={2000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
      <div className="flex flex-wrap gap-4 text-[12px]"><label className="flex items-center gap-2"><input type="checkbox" checked={draft.isPublic} onChange={(e) => setDraft({ ...draft, isPublic: e.target.checked })} /> Public</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.isFeatured} onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })} /> Featured</label></div>
      {error ? <p role="alert" className="text-[12px] text-rose-600">{error}</p> : null}
      <div className="flex gap-2"><button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white disabled:opacity-60"><Plus className="h-4 w-4" />{saving ? "Saving…" : editing ? "Save changes" : "Add item"}</button>{editing ? <button type="button" onClick={() => { setEditing(null); setDraft(empty); }} className="rounded-full border px-4 text-[13px]">Cancel</button> : null}</div>
    </form>
  </div>;
}
