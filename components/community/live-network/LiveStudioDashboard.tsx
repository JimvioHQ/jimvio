"use client";

import Link from "next/link";
import {
  Camera,
  Mic,
  Monitor,
  AppWindow,
  Circle,
  Signal,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveStudioControls, LiveStudioLayout } from "@/lib/community/live-network";
import {
  getLiveMediaProvider,
  listLiveMediaProviders,
  setLiveMediaVendor,
  type LiveMediaVendor,
} from "@/lib/community/live-network";

function fmtTimer(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LiveStudioDashboard({
  base,
  controls,
  onPatch,
  onLayout,
  className,
}: {
  base: string;
  controls: LiveStudioControls;
  onPatch: (patch: Partial<LiveStudioControls>) => void;
  onLayout: (layout: LiveStudioLayout) => void;
  className?: string;
}) {
  const provider = getLiveMediaProvider();
  const vendors = listLiveMediaProviders();

  const toggles: Array<{
    key: keyof LiveStudioControls;
    label: string;
    icon: typeof Camera;
    on: boolean;
  }> = [
    { key: "camera", label: "Camera", icon: Camera, on: controls.camera },
    { key: "microphone", label: "Microphone", icon: Mic, on: controls.microphone },
    { key: "screenShare", label: "Screen share", icon: Monitor, on: controls.screenShare },
    { key: "windowShare", label: "Window share", icon: AppWindow, on: controls.windowShare },
    { key: "backgroundBlur", label: "Background blur", icon: Camera, on: controls.backgroundBlur },
    { key: "noiseSuppression", label: "Noise suppression", icon: Mic, on: controls.noiseSuppression },
    { key: "recording", label: "Recording", icon: Circle, on: controls.recording },
  ];

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Live studio"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            Live Commerce Network
          </p>
          <h3 className="mt-0.5 text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
            Live Studio
          </h3>
          <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
            Broadcast controls · provider{" "}
            <span className="font-semibold text-[var(--color-text-secondary)]">
              {provider.label}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-600">
            <Timer className="h-3.5 w-3.5" aria-hidden />
            {fmtTimer(controls.liveSeconds)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            <Signal className="h-3.5 w-3.5" aria-hidden />
            {controls.connectionQuality}
          </span>
          <Link
            href={`${base}/live`}
            className="rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            Open studio
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {vendors.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setLiveMediaVendor(v.id as LiveMediaVendor)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
              provider.id === v.id
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)]"
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {toggles.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() =>
                onPatch({ [t.key]: !t.on } as Partial<LiveStudioControls>)
              }
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition",
                t.on
                  ? "border-[var(--color-accent)]/35 bg-[var(--color-accent-subtle)]"
                  : "border-[var(--color-border)]"
              )}
            >
              <Icon className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                  {t.label}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {t.on ? "On" : "Off"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Layouts & scenes
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {provider.listLayouts().map((layout) => (
            <button
              key={layout}
              type="button"
              onClick={() => onLayout(layout)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize",
                controls.layout === layout
                  ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)]"
              )}
            >
              {layout.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Main", "Product demo", "Interview", "Classroom"].map((scene) => (
            <button
              key={scene}
              type="button"
              onClick={() => onPatch({ scene })}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[11px] font-semibold",
                controls.scene === scene
                  ? "border-[var(--color-accent)]/40 text-[var(--color-accent)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)]"
              )}
            >
              {scene}
            </button>
          ))}
        </div>
        {controls.replayReady && (
          <p className="mt-2 text-[12px] font-medium text-emerald-700">
            Replay ready for this session.
          </p>
        )}
      </div>
    </section>
  );
}
