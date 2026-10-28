"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  QrCode,
  RefreshCw,
  TimerOff,
} from "lucide-react";
import {
  AffiliateEmptyState,
  AffiliatePageShell,
} from "./AffiliatePageShell";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_BTN_SECONDARY,
  formatAffiliateMoney,
} from "./sections/shared";
import { affiliateLinkStatus } from "@/lib/affiliate/guidance";
import { isAcceptedAffiliateDestination } from "@/lib/affiliate/tracking-guard";
import { cn } from "@/lib/utils";

type AffLink = {
  id: string;
  linkCode: string;
  customSlug: string | null;
  destinationUrl: string;
  fullUrl: string;
  shortUrl: string;
  commissionRate: number | null;
  clicks: number;
  conversions: number;
  earnings: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string; currency?: string } | null;
};

export function AffiliateLinksClient() {
  const [links, setLinks] = useState<AffLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<{ id: string; url: string; dataUrl: string } | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newDest, setNewDest] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliates/links?all=1", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setError(res.status === 401 ? "Sign in required" : "Activate affiliate access");
        setLinks([]);
        return;
      }
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setLinks(data.links ?? []);
    } catch {
      setError("Could not load links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchLink = (id: string, body: Record<string, unknown>) => {
    startTransition(async () => {
      const res = await fetch(`/api/affiliates/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice(
          typeof data?.error === "string" && data.error.length < 180
            ? data.error
            : "Could not update that link.",
        );
        return;
      }
      setNotice("Link updated.");
      await load();
    });
  };

  const onCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setNotice("Link copied.");
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setNotice("Could not copy automatically. Select the short link and copy it.");
    }
  };

  const showQr = async (link: AffLink) => {
    const url = link.shortUrl || link.fullUrl;
    const QRCode = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: "#111827", light: "#FFFFFF" },
    });
    setQrFor({ id: link.id, url, dataUrl });
  };

  const createLink = () => {
    if (!newDest.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/affiliates/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl: newDest.trim(),
          customSlug: newSlug.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice(
          typeof data?.error === "string" && data.error.length < 180
            ? data.error
            : "Could not create that link.",
        );
        return;
      }
      setNewDest("");
      setNewSlug("");
      setNotice(
        typeof data?.warning === "string" && data.warning.length < 180
          ? data.warning
          : "Link ready. Copy the short link below.",
      );
      await load();
    });
  };

  return (
    <AffiliatePageShell
      title="Link Manager"
      subtitle="Generate short links, QR codes, rename, expire, and track clicks & conversions."
      actions={
        <button
          type="button"
          onClick={() => void load()}
          className={cn(AFFILIATE_BTN_SECONDARY, "h-10 px-3.5 text-[12.5px]")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      }
    >
      <div className="mb-5 rounded-[18px] border border-[#E8EAED] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-[14px] font-bold text-[#111827]">Generate link</h2>
        <p className="mt-1 text-[12.5px] text-[#6B7280]">
          Paste any Jimvio product or destination URL. Optional custom short slug.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_0.7fr_auto]">
          <input
            value={newDest}
            onChange={(e) => setNewDest(e.target.value)}
            placeholder="https://jimvio.com/marketplace/..."
            className="h-11 rounded-[10px] border border-[#E5E7EB] px-3 text-[13px] outline-none focus:border-[#FF5A1F]/50 focus:ring-2 focus:ring-[#FF5A1F]/20"
          />
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="custom-slug"
            className="h-11 rounded-[10px] border border-[#E5E7EB] px-3 text-[13px] outline-none focus:border-[#FF5A1F]/50 focus:ring-2 focus:ring-[#FF5A1F]/20"
          />
          <button
            type="button"
            onClick={createLink}
            disabled={pending || !newDest.trim()}
            className={cn(AFFILIATE_BTN_PRIMARY, "h-11 px-4 text-[13px] disabled:opacity-60")}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Create
          </button>
        </div>
      </div>

      {notice ? (
        <p className="mb-3 text-[13px] font-medium text-[#111827]" role="status">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#F3F4F6]" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <AffiliateEmptyState
          title="Links unavailable"
          description={error}
          actionHref={
            error.includes("Activate")
              ? "/activate/affiliate"
              : "/login?next=/affiliates/links"
          }
          actionLabel={error.includes("Activate") ? "Activate" : "Sign in"}
        />
      ) : null}

      {!loading && !error && links.length === 0 ? (
        <AffiliateEmptyState
          title="No links yet"
          description="Create a tracked link above, or promote a product from the Affiliate Hub."
          actionHref="/affiliates"
          actionLabel="Browse products"
        />
      ) : null}

      {!loading && !error && links.length > 0 ? (
        <div className="space-y-3">
          {links.map((link) => {
            const status = affiliateLinkStatus({
              isActive: link.isActive,
              expiresAt: link.expiresAt,
            });
            const destinationTracked = isAcceptedAffiliateDestination(
              link.destinationUrl,
              "https://www.jimvio.com/",
            );
            return (
            <div
              key={link.id}
              className="rounded-[16px] border border-[#E8EAED] bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-[14px] font-bold text-[#111827]">
                      {link.product?.name ?? "Custom destination"}
                    </h3>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        status.label === "Active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-stone-100 text-stone-500"
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  {status.detail ? (
                    <p className="mt-1 text-[12px] text-[#6B7280]">{status.detail}</p>
                  ) : null}
                  {!destinationTracked ? (
                    <p className="mt-1 text-[12px] text-[#6B7280]">
                      Visits open the marketplace because this destination is not a Jimvio page.
                    </p>
                  ) : null}
                  {link.product?.slug ? (
                    <p className="mt-0.5 text-[12px] text-[#6B7280]">
                      Product:{" "}
                      <Link
                        href={`/marketplace/${link.product.slug}`}
                        className="font-semibold text-[#111827] hover:text-[#FF5A1F]"
                      >
                        /marketplace/{link.product.slug}
                      </Link>
                    </p>
                  ) : null}
                  <p className="mt-1 break-all font-mono text-[12px] text-[#6B7280]">
                    {link.shortUrl}
                    {link.customSlug ? ` · /ref/${link.customSlug}` : ""}
                  </p>
                  <p className="mt-1.5 text-[12px] text-[#9CA3AF]">
                    {link.clicks} clicks · {link.conversions} conversions ·{" "}
                    {formatAffiliateMoney(link.earnings, "USD")} earned
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => void onCopy(link.shortUrl, link.id)}
                    className={cn(AFFILIATE_BTN_SECONDARY, "h-9 px-3 text-[12px]")}
                  >
                    {copied === link.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === link.id ? "Link copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void showQr(link)}
                    className={cn(AFFILIATE_BTN_SECONDARY, "h-9 px-3 text-[12px]")}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameId(link.id);
                      setRenameValue(link.customSlug ?? "");
                    }}
                    className={cn(AFFILIATE_BTN_SECONDARY, "h-9 px-3 text-[12px]")}
                  >
                    Rename
                  </button>
                  {status.label === "Active" ? (
                    <button
                      type="button"
                      onClick={() => patchLink(link.id, { expire: true })}
                      className={cn(AFFILIATE_BTN_SECONDARY, "h-9 px-3 text-[12px] text-red-600")}
                    >
                      <TimerOff className="h-3.5 w-3.5" />
                      Expire
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        patchLink(link.id, { isActive: true, expiresAt: null })
                      }
                      className={cn(AFFILIATE_BTN_SECONDARY, "h-9 px-3 text-[12px]")}
                    >
                      Reactivate
                    </button>
                  )}
                  {link.product?.slug ? (
                    <Link
                      href={`/affiliates/promote/${link.product.slug}`}
                      className={cn(AFFILIATE_BTN_PRIMARY, "h-9 px-3 text-[12px]")}
                    >
                      Promote
                    </Link>
                  ) : null}
                </div>
              </div>

              {renameId === link.id ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[#F3F4F6] pt-3">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="custom-slug"
                    className="h-10 min-w-[180px] flex-1 rounded-[10px] border border-[#E5E7EB] px-3 text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      patchLink(link.id, { customSlug: renameValue });
                      setRenameId(null);
                    }}
                    className={cn(AFFILIATE_BTN_PRIMARY, "h-10 px-3 text-[12px]")}
                  >
                    Save name
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenameId(null)}
                    className={cn(AFFILIATE_BTN_SECONDARY, "h-10 px-3 text-[12px]")}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}

              {qrFor?.id === link.id ? (
                <div className="mt-3 flex flex-col items-center gap-2 border-t border-[#F3F4F6] pt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrFor.dataUrl} alt="QR" className="h-[160px] w-[160px] rounded-lg" />
                  <p className="break-all text-center text-[11px] text-[#6B7280]">{qrFor.url}</p>
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      ) : null}
    </AffiliatePageShell>
  );
}
