"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import {
  addTemplate,
  getTemplates,
  toggleTemplateFavorite,
  type UGCTemplate,
} from "@/lib/ugc/templates-storage";
import { cn } from "@/lib/utils";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageShell,
} from "./UGCPageShell";

const CATEGORIES = ["all", "hook", "caption", "script", "description", "cta", "hashtags"] as const;

export function UGCTemplatesPage() {
  const [templates, setTemplates] = useState<UGCTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newCategory, setNewCategory] = useState<UGCTemplate["category"]>("hook");

  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (favoritesOnly && !t.favorite) return false;
      if (category !== "all" && t.category !== category) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q);
    });
  }, [templates, search, category, favoritesOnly]);

  const save = useCallback(() => {
    if (!title.trim() || !body.trim()) return;
    setTemplates(addTemplate({ title: title.trim(), body: body.trim(), category: newCategory }));
    setTitle("");
    setBody("");
  }, [title, body, newCategory]);

  return (
    <UGCPageShell
      title="Templates"
      subtitle="Reusable hooks, captions, scripts, CTAs, and hashtag packs."
    >
      <UGCFilterBar search={search} onSearchChange={setSearch}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
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

      <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
        <h2 className="text-[14px] font-bold text-[#111827]">Create template</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Template title"
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as UGCTemplate["category"])}
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          >
            {CATEGORIES.filter((c) => c !== "all").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Template content…"
          rows={3}
          className="mt-2 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={save}
          className="mt-2 rounded-xl bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white"
        >
          Save template
        </button>
      </div>

      {filtered.length === 0 ? (
        <UGCPageEmpty
          title="No templates found"
          description="Create a template or clear your filters."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#FF5A1F]">{t.category}</p>
                  <h3 className="text-[14px] font-bold text-[#111827]">{t.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplates(toggleTemplateFavorite(t.id))}
                  aria-label="Toggle favorite"
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      t.favorite ? "fill-amber-400 text-amber-400" : "text-[#D1D5DB]",
                    )}
                  />
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] text-[#374151]">{t.body}</p>
            </div>
          ))}
        </div>
      )}
    </UGCPageShell>
  );
}
