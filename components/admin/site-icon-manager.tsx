"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, ImagePlus, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import { SITE_ICON_DEFINITIONS } from "@/lib/site-icons/config";

type Asset = { path: string; contentType: string; size: number; width: number; height: number; updatedAt: string };
type Settings = { assets: Record<string, Asset>; history: Record<string, Asset[]>; updatedAt: string };

const groups = ["Browser", "Apple & iOS", "Android & PWA", "Windows & Safari", "Storefronts"] as const;

async function readApiJson(response: Response): Promise<Record<string, any>> {
  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error(`Icon service returned an empty response (HTTP ${response.status}). Please refresh and try again.`);
  }
  let data: Record<string, any>;
  try {
    data = JSON.parse(raw) as Record<string, any>;
  } catch {
    throw new Error(`Icon service returned an invalid response (HTTP ${response.status}). Please refresh and try again.`);
  }
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `Icon request failed (HTTP ${response.status})`);
  return data;
}

export function SiteIconManager() {
  const [settings, setSettings] = useState<Settings>({ assets: {}, history: {}, updatedAt: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/site-icons", { cache: "no-store" });
      const data = await readApiJson(response);
      setSettings(data as Settings);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not load icons" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeCount = useMemo(() => Object.keys(settings.assets).length, [settings.assets]);

  async function upload(slot: string, file?: File) {
    if (!file) return;
    setBusy(slot);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("slot", slot);
      form.set("file", file);
      const response = await fetch("/api/admin/site-icons", { method: "POST", body: form });
      const data = await readApiJson(response);
      setSettings(data.settings as Settings);
      setMessage({ type: "success", text: "Icon saved. The live site will begin serving this version immediately." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload failed" });
    } finally {
      setBusy(null);
    }
  }

  async function mutate(slot: string, action: "reset" | "restore", versionPath?: string) {
    setBusy(slot);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/site-icons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, action, versionPath }),
      });
      const data = await readApiJson(response);
      setSettings(data.settings as Settings);
      setMessage({ type: "success", text: action === "reset" ? "Default Jimvio icon restored." : "Previous icon version restored." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not update icon" });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 py-12 text-sm text-[var(--color-text-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading icon library…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Live icon library</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{activeCount} custom icons active · {SITE_ICON_DEFINITIONS.length} managed icon slots</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Admin-only uploads · version history enabled
        </div>
      </div>

      {message && (
        <div role="status" className={`rounded-lg border px-3 py-2.5 text-sm ${message.type === "success" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700" : "border-red-500/30 bg-red-500/5 text-red-600"}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><ImagePlus className="h-4 w-4" /> Preview</div>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Preview of the currently active browser, mobile and app marks.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { slot: "favicon-32", label: "Browser tab" },
            { slot: "apple-touch", label: "iPhone home screen" },
            { slot: "pwa-192", label: "Android app" },
            { slot: "pwa-maskable-512", label: "Adaptive icon" },
          ].map((item) => (
            <div key={item.slot} className="flex min-w-0 flex-col items-center gap-2 rounded-lg border border-[var(--color-border)] p-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)]">
                <img src={`/api/site-icons/${item.slot}?v=${settings.updatedAt}`} alt={item.label} className="h-12 w-12 object-contain" />
              </div>
              <span className="text-center text-[11px] text-[var(--color-text-muted)]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {groups.map((group) => (
        <section key={group} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{group}</h2>
            <span className="text-[11px] text-[var(--color-text-muted)]">{SITE_ICON_DEFINITIONS.filter((item) => item.group === group).length} assets</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SITE_ICON_DEFINITIONS.filter((item) => item.group === group).map((item) => {
              const active = settings.assets[item.slot];
              const history = settings.history[item.slot] ?? [];
              const isBusy = busy === item.slot;
              return (
                <article key={item.slot} className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                      <img src={`/api/site-icons/${item.slot}?v=${settings.updatedAt}`} alt="" className="h-9 w-9 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{item.label}</h3>
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{item.width ? `${item.width} × ${item.height} px · ` : ""}{item.filename}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-muted)]">{item.help}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white hover:brightness-95">
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                      Upload
                      <input
                        type="file"
                        accept={item.contentType === "image/png" ? "image/png" : item.contentType === "image/svg+xml" ? "image/svg+xml" : ".ico,image/x-icon"}
                        className="sr-only"
                        disabled={Boolean(busy)}
                        onChange={(event) => { void upload(item.slot, event.target.files?.[0]); event.currentTarget.value = ""; }}
                      />
                    </label>
                    {active ? (
                      <button type="button" onClick={() => void mutate(item.slot, "reset")} disabled={Boolean(busy)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] disabled:opacity-50">
                        <RotateCcw className="h-3.5 w-3.5" /> Default
                      </button>
                    ) : <span className="text-[11px] text-[var(--color-text-muted)]">Using repository default</span>}
                    <a href={`/api/site-icons/${item.slot}?v=${settings.updatedAt}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {active && <p className="mt-2 truncate text-[10px] text-[var(--color-text-muted)]">Updated {new Date(active.updatedAt).toLocaleString()}</p>}
                  {history.length > 0 && (
                    <details className="mt-3 border-t border-[var(--color-border)] pt-2">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                        <Clock3 className="h-3.5 w-3.5" /> Previous versions ({history.length})
                      </summary>
                      <div className="mt-2 space-y-2">
                        {history.map((version) => (
                          <div key={version.path} className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="truncate text-[var(--color-text-muted)]">{new Date(version.updatedAt).toLocaleString()}</span>
                            <button type="button" onClick={() => void mutate(item.slot, "restore", version.path)} disabled={Boolean(busy)} className="shrink-0 rounded-md border border-[var(--color-border)] px-2 py-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] disabled:opacity-50">Restore</button>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
      <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">Uploaded icons are served from versioned storage URLs through Jimvio’s icon endpoint. Existing repository icons remain the fallback. Some browsers and already-installed PWAs may retain their own icon cache until refreshed or reinstalled.</p>
    </div>
  );
}
