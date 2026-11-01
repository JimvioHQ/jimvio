"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { BadgeCheck, ChevronRight, Clock, Plus, Trash2 } from "lucide-react";
import type { IdentitySocialAccount, IdentitySocialPlatform } from "@/lib/identity/types";
import { SocialPlatformIcon, SOCIAL_PLATFORM_LABEL } from "@/components/identity/SocialPlatformIcon";

const PLATFORMS: IdentitySocialPlatform[] = [
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "x",
  "threads",
  "linkedin",
  "pinterest",
  "snapchat",
];

function formatCount(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

/**
 * Your social accounts. Adding or verifying one opens a guided page:
 * official login for YouTube/TikTok, a bio code for the rest.
 */
export function SocialAccountsManager({
  accounts,
  onChange,
}: {
  accounts: IdentitySocialAccount[];
  onChange: React.Dispatch<React.SetStateAction<IdentitySocialAccount[]>>;
}) {
  const social = accounts.filter((a) => a.platform !== "website");
  const used = new Set(social.map((a) => a.platform));
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function togglePublic(account: IdentitySocialAccount, isPublic: boolean) {
    const previous = account.isPublic === true;
    onChange((current) => current.map((item) => item.id === account.id ? { ...item, isPublic } : item));
    setUpdatingId(account.id);
    try {
      const response = await fetch("/api/identity/social", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id, isPublic }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not update account visibility.");
      const savedVisibility = typeof json.account?.isPublic === "boolean" ? json.account.isPublic : isPublic;
      onChange((current) => current.map((item) => item.id === account.id ? { ...item, isPublic: savedVisibility } : item));
      toast.success(savedVisibility ? "Account will appear on your public profile." : "Account hidden from your public profile.");
    } catch (err) {
      onChange((current) => current.map((item) => item.id === account.id ? { ...item, isPublic: previous } : item));
      toast.error(err instanceof Error ? err.message : "Could not update account visibility.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this account from your profile?")) return;
    onChange((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/identity/social?id=${id}`, { method: "DELETE" }).catch(() => undefined);
  }

  return (
    <div className="space-y-4">
      {social.length > 0 ? (
        <ul className="divide-y divide-[#F3F4F6] overflow-hidden rounded-2xl border border-[#E8E8E8]">
          {social.map((a) => {
            const status = a.isVerified ? "verified" : a.verifyStatus ?? "unverified";
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                <SocialPlatformIcon platform={a.platform} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[#111827]">
                    {a.handle ? `@${a.handle.replace(/^@/, "")}` : a.url ?? SOCIAL_PLATFORM_LABEL[a.platform]}
                  </p>
                  <p className="text-[12px] text-[#6B7280]">
                    {SOCIAL_PLATFORM_LABEL[a.platform]}
                    {a.isVerified && a.followers > 0 ? ` · ${formatCount(a.followers)} followers` : ""}
                  </p>
                </div>
                {status === "verified" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : status === "pending_review" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11.5px] font-semibold text-sky-700">
                    <Clock className="h-3.5 w-3.5" /> In review
                  </span>
                ) : (
                  <Link
                    href={`/settings/profile/social/${a.platform}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[#FF5A1F] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#E54E18]"
                  >
                    {status === "failed" ? "Try again" : "Verify"} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
                <label className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-[#6B7280]">
                  <input
                    type="checkbox"
                    checked={a.isPublic === true}
                    disabled={updatingId === a.id}
                    onChange={(event) => void togglePublic(a, event.target.checked)}
                    aria-label={"Show " + SOCIAL_PLATFORM_LABEL[a.platform] + " on public profile"}
                    className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#FF5A1F] focus:ring-[#FF5A1F]/30"
                  />
                  Public
                </label>
                <button
                  type="button"
                  aria-label={`Remove ${SOCIAL_PLATFORM_LABEL[a.platform]}`}
                  onClick={() => void remove(a.id)}
                  className="rounded-lg p-2 text-[#9CA3AF] hover:bg-black/5 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl bg-[#F9FAFB] px-4 py-3 text-[13px] text-[#6B7280]">
          No accounts yet. Add the ones you post on — each is verified so brands know it&apos;s really you.
        </p>
      )}

      {PLATFORMS.some((p) => !used.has(p)) ? (
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-[#374151]">Add an account</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PLATFORMS.filter((p) => !used.has(p)).map((p) => (
              <Link
                key={p}
                href={`/settings/profile/social/${p}`}
                className="group flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-[13px] font-medium text-[#374151] transition hover:border-[#FF5A1F]/50 hover:bg-[#FFF7F2]"
              >
                <SocialPlatformIcon platform={p} className="h-7 w-7" />
                <span className="flex-1">{SOCIAL_PLATFORM_LABEL[p]}</span>
                <Plus className="h-3.5 w-3.5 text-[#9CA3AF] group-hover:text-[#FF5A1F]" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
