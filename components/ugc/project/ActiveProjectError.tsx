"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw, WifiOff } from "lucide-react";
import type { ActiveProjectState } from "./use-active-project";

export function ActiveProjectError({
  state,
  campaignId,
  onRetry,
}: {
  state: Extract<ActiveProjectState, { status: "error" }>;
  campaignId: string;
  onRetry: () => void;
}) {
  const Icon =
    state.kind === "offline" ? WifiOff : state.kind === "forbidden" ? AlertCircle : AlertCircle;

  const title =
    state.kind === "not_found"
      ? "Project not found"
      : state.kind === "offline"
        ? "Connection error"
        : state.kind === "pending"
          ? "Application under review"
          : "Access required";

  const cta =
    state.kind === "pending"
      ? { href: `/ugc/${campaignId}/application`, label: "View application" }
      : state.kind === "forbidden"
        ? { href: `/ugc/${campaignId}/join`, label: "Join campaign" }
        : null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FFF4EF]">
        <Icon className="h-6 w-6 text-[var(--color-accent)]" />
      </div>
      <div>
        <p className="text-base font-bold text-[#111827]">{title}</p>
        <p className="mt-1 text-sm text-[#6B7280]">{state.message}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
        {cta ? (
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151]"
          >
            {cta.label}
          </Link>
        ) : null}
        <Link
          href="/ugc"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>
      </div>
    </div>
  );
}
