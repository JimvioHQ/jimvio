"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, Upload } from "lucide-react";
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

type LibraryItem = {
  id: string;
  title: string | null;
  file_url: string;
  thumbnail_url?: string | null;
  media_type: string;
  status: string;
  tags?: string[] | null;
  created_at: string;
};

const STATUSES = ["all", "uploaded", "draft", "approved", "rejected", "archived"] as const;
const MEDIA_TYPES = ["all", "video", "image", "file", "audio"] as const;

export function UGCLibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [mediaType, setMediaType] = useState<string>("all");
  const [fileUrl, setFileUrl] = useState("");
  const [title, setTitle] = useState("");
  const [uploadType, setUploadType] = useState("video");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (status !== "all") params.set("status", status);
      if (mediaType !== "all") params.set("media_type", mediaType);
      const res = await fetch(`/api/ugc/library?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      setError("Could not load content library.");
    } finally {
      setLoading(false);
    }
  }, [search, status, mediaType]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async () => {
    if (!fileUrl.trim()) {
      toast.error("Enter a file URL");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ugc/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: fileUrl.trim(),
          title: title.trim() || undefined,
          media_type: uploadType,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast.success("Added to library");
      setFileUrl("");
      setTitle("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this library item?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ugc/library/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast.success("Deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UGCPageShell
      title="Content Library"
      subtitle="Store and reuse clips, images, and assets across campaigns."
    >
      <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
        <h2 className="text-[14px] font-bold text-[#111827]">Upload by URL</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          />
          <input
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://… file URL"
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          />
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          >
            {MEDIA_TYPES.filter((m) => m !== "all").map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <Button
            disabled={busy}
            onClick={() => void upload()}
            className="rounded-xl bg-[#FF5A1F] hover:bg-[#E54E18]"
          >
            <Upload className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <UGCFilterBar search={search} onSearchChange={setSearch}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All status" : s}
            </option>
          ))}
        </select>
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
        >
          {MEDIA_TYPES.map((m) => (
            <option key={m} value={m}>
              {m === "all" ? "All media" : m}
            </option>
          ))}
        </select>
        <Button variant="outline" className="rounded-xl" onClick={() => void load()}>
          Refresh
        </Button>
      </UGCFilterBar>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && items.length === 0 ? (
        <UGCPageEmpty
          title="Library is empty"
          description="Add a file URL above to start building your reusable content library."
          illustration="campaigns"
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-[16px] border border-[#EEF0F2] bg-white p-4"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">
                  {item.media_type}
                </p>
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate text-[14px] font-bold text-[#111827] hover:text-[#FF5A1F]"
                >
                  {item.title || item.file_url}
                </a>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Added {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <UGCStatusPill status={item.status} />
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  disabled={busy}
                  onClick={() => void remove(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
