"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ForcePublishDialog({
  productId,
  productName,
  open,
  onClose,
  onSuccess,
}: {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleForcePublish() {
    if (!reason.trim()) {
      toast.error("Override reason is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/cj/auto-publish/force-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Force publish failed");

      toast.success(`Force published: ${productName}`);
      setReason("");
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="h-4 w-4 text-violet-600" />
          <h3 className="text-[14px] font-bold text-[#111827]">Force Publish</h3>
        </div>
        <p className="text-[11px] text-[#6B7280] mb-3">
          Bypass Auto Publish requirements for <strong>{productName}</strong>. Admin only.
        </p>
        <label className="block space-y-1">
          <span className="text-[10px] font-medium text-[#9CA3AF]">Override reason *</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why is this product being force published?"
            className="w-full rounded-[10px] border border-[#E5E7EB] px-2.5 py-2 text-[12px] focus:border-[var(--color-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/10"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-9 rounded-[10px] border border-[#E5E7EB] text-[12px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleForcePublish()}
            disabled={loading}
            className={cn(
              "flex-1 h-9 rounded-[10px] bg-violet-600 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60",
              "inline-flex items-center justify-center gap-1.5"
            )}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Force Publish
          </button>
        </div>
      </div>
    </>
  );
}
