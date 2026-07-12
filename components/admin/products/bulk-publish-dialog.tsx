"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rocket, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const CONCURRENCY = 5;
const CHUNK_SIZE = 10;

export type BulkPublishProduct = {
  id: string;
  name: string;
  status?: string;
  images?: unknown;
};

type Phase = "confirm" | "progress" | "result";

type PublishSummary = {
  published: number;
  skipped: number;
  failed: number;
  publishedIds: string[];
};

function isDraftPublishable(p: BulkPublishProduct): boolean {
  if (p.status === "archived" || p.status === "active") return false;
  if ((p.status ?? "draft") !== "draft") return false;
  const imgs = Array.isArray(p.images)
    ? p.images.filter((x): x is string => typeof x === "string" && x.startsWith("http"))
    : [];
  return imgs.length > 0;
}

async function publishChunk(
  productIds: string[],
  retry = false
): Promise<{
  published: number;
  skipped: number;
  failed: Array<{ id: string; name: string; error?: string }>;
  publishedIds: string[];
  publishedNames: Array<{ id: string; name: string }>;
}> {
  const res = await fetch("/api/admin/products/bulk-publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok && !retry) {
    await new Promise((r) => setTimeout(r, 400));
    return publishChunk(productIds, true);
  }

  if (!res.ok) {
    return {
      published: 0,
      skipped: 0,
      failed: productIds.map((id) => ({ id, name: id, error: data.error ?? "Request failed" })),
      publishedIds: [],
      publishedNames: [],
    };
  }

  const publishedIds = (data.details?.published ?? []).map((p: { id: string }) => p.id);
  return {
    published: data.published ?? 0,
    skipped: data.skipped ?? 0,
    failed: data.failed ?? data.details?.failed ?? [],
    publishedIds,
    publishedNames: data.details?.published ?? [],
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function BulkPublishDialog({
  open,
  products,
  onClose,
  onComplete,
}: {
  open: boolean;
  products: BulkPublishProduct[];
  onClose: () => void;
  onComplete: (summary: PublishSummary) => void;
}) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [progress, setProgress] = useState({ done: 0, total: 0, currentName: "" });
  const [summary, setSummary] = useState<PublishSummary>({
    published: 0,
    skipped: 0,
    failed: 0,
    publishedIds: [],
  });
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const startedAt = useRef<number>(0);
  const running = useRef(false);

  const draftTargets = useMemo(
    () => products.filter((p) => (p.status ?? "draft") === "draft"),
    [products]
  );
  const publishable = useMemo(() => draftTargets.filter(isDraftPublishable), [draftTargets]);
  const preSkipped = draftTargets.length - publishable.length;

  useEffect(() => {
    if (!open) {
      setPhase("confirm");
      setProgress({ done: 0, total: 0, currentName: "" });
      setSummary({ published: 0, skipped: 0, failed: 0, publishedIds: [] });
      setEtaSeconds(null);
      running.current = false;
    }
  }, [open]);

  const runPublish = useCallback(async () => {
    if (running.current || publishable.length === 0) return;
    running.current = true;
    setPhase("progress");
    startedAt.current = Date.now();
    setProgress({ done: 0, total: publishable.length, currentName: publishable[0]?.name ?? "" });
    const loadingToast = toast.loading("Publishing…");

    const chunks = chunkArray(publishable, CHUNK_SIZE);
    let done = 0;
    let published = 0;
    let skipped = preSkipped;
    let failed = 0;
    const publishedIds: string[] = [];
    const failedItems: Array<{ id: string; name: string }> = [];

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const wave = chunks.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        wave.map(async (chunk) => {
          const ids = chunk.map((p) => p.id);
          return publishChunk(ids);
        })
      );

      for (let w = 0; w < wave.length; w++) {
        const chunk = wave[w];
        const result = results[w];
        published += result.published;
        skipped += result.skipped;
        failed += result.failed.length;
        publishedIds.push(...result.publishedIds);
        failedItems.push(...result.failed);

        for (const p of chunk) {
          done += 1;
          const elapsed = (Date.now() - startedAt.current) / 1000;
          const rate = done / Math.max(elapsed, 0.1);
          const remaining = Math.ceil((publishable.length - done) / Math.max(rate, 0.1));
          setEtaSeconds(remaining);
          setProgress({
            done,
            total: publishable.length,
            currentName: p.name,
          });
        }
      }
    }

    const finalSummary: PublishSummary = {
      published,
      skipped,
      failed,
      publishedIds,
    };
    setSummary(finalSummary);
    setPhase("result");
    running.current = false;
    toast.dismiss(loadingToast);
    onComplete(finalSummary);
  }, [publishable, preSkipped, onComplete]);

  if (!open) return null;

  const pct =
    progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={phase === "progress" ? undefined : onClose}
    >
      <div
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "confirm" && (
          <div className="p-7">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 text-emerald-600">
              <Rocket size={20} />
            </div>
            <h2 className="font-semibold text-[16px] mb-1.5 text-[var(--color-text-primary)]">
              Publish {products.length} product{products.length !== 1 ? "s" : ""}?
            </h2>
            <p className="text-[13px] text-[var(--color-text-muted)] mb-1 leading-relaxed">
              These products will become visible in the marketplace.
            </p>
            {publishable.length < products.length && (
              <p className="text-[12px] text-amber-600 mb-4">
                {publishable.length} draft with images will publish.{" "}
                {products.length - publishable.length} will be skipped (already active, archived, or missing images).
              </p>
            )}
            {publishable.length === products.length && <div className="mb-4" />}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishable.length === 0}
                onClick={() => void runPublish()}
                className="h-9 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold disabled:opacity-50"
              >
                Publish
              </button>
            </div>
          </div>
        )}

        {phase === "progress" && (
          <div className="p-7">
            <h2 className="font-semibold text-[15px] mb-4 text-[var(--color-text-primary)]">
              Publishing Products…
            </h2>
            <div className="h-2 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden mb-3">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums">
              {progress.done} / {progress.total}
            </p>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-2 truncate">
              Current: {progress.currentName}
            </p>
            {etaSeconds != null && progress.done < progress.total && (
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                ~{etaSeconds}s remaining
              </p>
            )}
          </div>
        )}

        {phase === "result" && (
          <div className="p-7">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 text-emerald-600">
              {summary.failed > 0 ? (
                <AlertCircle size={20} />
              ) : (
                <CheckCircle2 size={20} />
              )}
            </div>
            <h2 className="font-semibold text-[15px] mb-4 text-[var(--color-text-primary)]">
              Publish complete
            </h2>
            <ul className="space-y-2 text-[13px] mb-5">
              <li className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={14} /> Successfully published: {summary.published}
              </li>
              <li className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <AlertCircle size={14} /> Skipped: {summary.skipped}
              </li>
              <li className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <XCircle size={14} /> Failed: {summary.failed}
              </li>
            </ul>
            <div className="flex gap-2 justify-end">
              {summary.published > 0 && (
                <Link
                  href="/admin/products?status=active"
                  className="h-9 px-4 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-[13px] font-semibold inline-flex items-center"
                  onClick={onClose}
                >
                  View Published
                </Link>
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
