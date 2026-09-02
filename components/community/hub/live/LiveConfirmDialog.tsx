"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "./studio-ui";

export function LiveConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-confirm-title"
      aria-describedby="live-confirm-desc"
    >
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
        <h2 id="live-confirm-title" className="text-[16px] font-bold tracking-[-0.02em] text-[#111827]">
          {title}
        </h2>
        <p id="live-confirm-desc" className="mt-2 text-[13px] leading-relaxed text-neutral-600">
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-full border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60",
              FOCUS_RING
            )}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white disabled:opacity-60",
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#FF5A1F] hover:bg-[#e54e1a]",
              FOCUS_RING
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
