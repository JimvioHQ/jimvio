"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Link2, Info } from "lucide-react";

type Account = { connected: boolean; canReadViews: boolean; name: string | null };

const LABEL: Record<string, string> = { youtube: "YouTube", tiktok: "TikTok" };

/**
 * Tells the creator whether Jimvio can verify views for the chosen platform
 * and links to connect the account before submitting.
 */
export function RealViewsConnectNotice({ platform }: { platform: string }) {
  const [accounts, setAccounts] = useState<Record<string, Account> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ugc/verification/accounts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) setAccounts(json?.accounts ?? {});
      })
      .catch(() => {
        if (!cancelled) setAccounts({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!platform) return null;
  const label = LABEL[platform];
  if (!label) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[12px] text-[#4B5563]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Automatic view checks for this platform are coming soon. The brand reviews your views by hand.
      </p>
    );
  }
  if (!accounts) return null;
  const account = accounts[platform];
  const returnPath = typeof window !== "undefined" ? window.location.pathname : "/ugc";
  const connectHref = `/api/integrations/${platform}/start?return=${encodeURIComponent(returnPath)}`;

  if (account?.connected && account.canReadViews) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
        <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Real views on. Jimvio reads this post from {label} on {account.name ?? "your account"}. Only views gained after
        you submit are paid, so submit right after posting.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-[#FFD9C7] bg-[#FFF7F2] px-3 py-2.5 text-[12px] text-[#7C2D12]">
      <p className="font-semibold">Connect {label} to get paid for real views</p>
      <p className="mt-0.5">
        {account?.connected
          ? `Reconnect ${label} and allow Jimvio to read your videos.`
          : `Jimvio reads views from ${label}'s official API on your own account. The post must be on the account you connect.`}
      </p>
      <a
        href={connectHref}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#FF5A1F] px-3 py-1.5 font-semibold text-white hover:opacity-90"
      >
        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
        {account?.connected ? `Reconnect ${label}` : `Connect ${label}`}
      </a>
    </div>
  );
}
