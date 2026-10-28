"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import {
  AffiliateEmptyState,
  AffiliatePageShell,
} from "./AffiliatePageShell";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_BTN_SECONDARY,
  formatAffiliateMoney,
} from "./sections/shared";
import { cn } from "@/lib/utils";
import { formatAffiliateRate } from "@/lib/affiliate/commission-tiers";
import { sanitizeAffiliateAiCopy, shouldOfferAffiliateWorkspace } from "@/lib/ai/affiliate-workspace";
import { acceptOwnedTrackingUrl } from "@/lib/affiliate/owned-tracking-url";
import { draftAffiliatePromotion } from "@/lib/affiliate/promotion-draft";
import { AffiliateAiRecovery, persistAffiliateHandoff } from "./AffiliateAiRecovery";

type ProductOpt = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  rate: number;
  earning?: number;
  description?: string;
  features?: string[];
  trackingUrl?: string | null;
};

type PromoResult = {
  tiktokCaption?: string;
  instagramCaption?: string;
  youtubeTitle?: string;
  facebookPost?: string;
  threadsPost?: string;
  xPost?: string;
  emailCopy?: string;
  blogIntro?: string;
  keywords?: string[];
  seoTitle?: string;
  hashtags?: string[];
  hooks?: string[];
  scripts?: string[];
};

type PromoTextKey = Exclude<keyof PromoResult, "keywords" | "hashtags" | "hooks" | "scripts">;

const FIELDS: Array<{ key: PromoTextKey; label: string }> = [
  { key: "tiktokCaption", label: "TikTok caption" },
  { key: "instagramCaption", label: "Instagram caption" },
  { key: "youtubeTitle", label: "YouTube title" },
  { key: "facebookPost", label: "Facebook post" },
  { key: "threadsPost", label: "Threads" },
  { key: "xPost", label: "X post" },
  { key: "emailCopy", label: "Email copy" },
  { key: "blogIntro", label: "Blog intro" },
  { key: "seoTitle", label: "SEO title" },
];

export function AffiliateAiClient({ products }: { products: ProductOpt[] }) {
  const pathname = usePathname() ?? "/affiliates/ai";
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [result, setResult] = useState<PromoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offerWorkspace, setOfferWorkspace] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = products.find((p) => p.id === selectedId) ?? products[0];
  const trackedLink = acceptOwnedTrackingUrl(selected?.trackingUrl);

  useEffect(() => {
    if (!selectedId && products[0]) setSelectedId(products[0].id);
  }, [products, selectedId]);

  const generate = useCallback(() => {
    if (!selected) return;
    startTransition(async () => {
      setError(null);
      setDraftNote(null);
      setOfferWorkspace(false);
      setResult(null);
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "affiliate_promotion",
            productId: selected.id,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message = sanitizeAffiliateAiCopy(
            data?.error ||
              (res.status === 401
                ? "Sign in to generate promotion assets."
                : "Jimvio AI couldn't finish these promotion assets just now."),
          );
          if (
            selected &&
            shouldOfferAffiliateWorkspace(res.status, data?.code) &&
            persistAffiliateHandoff({
              productId: selected.id,
              returnPath: pathname,
            })
          ) {
            router.push("/ai");
            return;
          }
          setError(message);
          setOfferWorkspace(shouldOfferAffiliateWorkspace(res.status, data?.code));
          return;
        }
        if (!data?.data) {
          setError("Jimvio AI returned an empty response. Retry generation.");
          return;
        }
        setResult(data.data);
        setDraftNote("Edit any block before you copy it. Nothing is posted for you.");
      } catch {
        if (
          selected &&
          persistAffiliateHandoff({
            productId: selected.id,
            returnPath: pathname,
          })
        ) {
          router.push("/ai");
          return;
        }
        setError("Jimvio AI couldn't finish these promotion assets just now.");
        setOfferWorkspace(true);
      }
    });
  }, [pathname, router, selected]);

  const draftFromListing = () => {
    if (!selected) return;
    const draft = draftAffiliatePromotion({
      name: selected.name,
      category: selected.category,
      description: selected.description,
      price: selected.price,
      currency: selected.currency,
      commissionRate: selected.rate,
      trackingUrl: acceptOwnedTrackingUrl(selected.trackingUrl),
    });
    setError(null);
    setOfferWorkspace(false);
    setDraftNote(draft.limitation);
    setResult(draft);
  };

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setError("Could not copy automatically. Select the text and copy it.");
    }
  };

  return (
    <AffiliatePageShell
      title="AI Promotion"
      subtitle="Generate TikTok, Instagram, YouTube, Facebook, Threads, X, email, blog, SEO, hashtags, hooks, and scripts."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={draftFromListing}
            disabled={!selected}
            className={cn(AFFILIATE_BTN_SECONDARY, "h-10 px-3.5 text-[12.5px] disabled:opacity-60")}
          >
            Draft from listing
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={pending || !selected}
            className={cn(AFFILIATE_BTN_PRIMARY, "h-10 px-3.5 text-[12.5px] disabled:opacity-60")}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate assets
          </button>
        </div>
      }
    >
      {products.length === 0 ? (
        <AffiliateEmptyState
          title="No products to promote"
          description="Browse the Affiliate Hub and open a product to unlock AI promotion."
          actionHref="/affiliates"
          actionLabel="Browse products"
        />
      ) : (
        <div className="space-y-5">
          <div className="rounded-[18px] border border-[#E8EAED] bg-white p-4 shadow-sm sm:p-5">
            <label className="text-[12px] font-semibold text-[#6B7280]">Product</label>
            <select
              value={selected?.id ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] bg-white px-3 text-[13px] outline-none focus:border-[#FF5A1F]/50"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatAffiliateRate(p.rate)}%
                </option>
              ))}
            </select>
            {selected ? (
              <p className="mt-2 text-[12.5px] text-[#6B7280]">
                {selected.category} ·{" "}
                {formatAffiliateMoney(selected.price, "USD")} ·{" "}
                {formatAffiliateRate(selected.rate)}% commission
                {selected.earning != null
                  ? ` · ${formatAffiliateMoney(selected.earning, "USD")} per sale`
                  : ""}
              </p>
            ) : null}
            {selected && trackedLink ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 break-all text-[12.5px] text-[#374151]">
                  <span className="font-semibold text-[#111827]">Your tracked link. </span>
                  {trackedLink}
                </p>
                <button
                  type="button"
                  onClick={() => void copyText("tracked-link", trackedLink)}
                  className={cn(AFFILIATE_BTN_SECONDARY, "h-9 shrink-0 px-3 text-[12px]")}
                >
                  {copied === "tracked-link" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copy tracked link
                </button>
              </div>
            ) : selected ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-[#6B7280]">
                No tracked link for this product yet. Use Promote Now or Link Manager. Drafting does not create one.
              </p>
            ) : null}
            {error && offerWorkspace && selected ? (
              <AffiliateAiRecovery
                message={error}
                productId={selected.id}
                returnPath={pathname}
                pending={pending}
                onRetry={generate}
              />
            ) : error ? (
              <p className="mt-3 text-[12px] font-medium text-red-700" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          {result ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {draftNote ? (
                <p className="text-[12.5px] leading-relaxed text-[#6B7280] lg:col-span-2">{draftNote}</p>
              ) : null}
              {FIELDS.map(({ key, label }) => {
                const value = result[key];
                if (typeof value !== "string") return null;
                return (
                  <div
                    key={key}
                    className="rounded-[16px] border border-[#E8EAED] bg-white p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-[13px] font-bold text-[#111827]">{label}</h3>
                      <button
                        type="button"
                        onClick={() => void copyText(key, value)}
                        className={cn(AFFILIATE_BTN_SECONDARY, "h-8 px-2.5 text-[11px]")}
                      >
                        {copied === key ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        Copy
                      </button>
                    </div>
                    <textarea
                      value={value}
                      onChange={(event) =>
                        setResult((current) =>
                          current ? { ...current, [key]: event.target.value } : current,
                        )
                      }
                      rows={key === "youtubeTitle" || key === "seoTitle" ? 2 : 5}
                      className="w-full resize-y rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-[13px] leading-relaxed text-[#4B5563] outline-none focus:border-[#FF5A1F]/40"
                    />
                  </div>
                );
              })}

              {result.hashtags?.length ? (
                <div className="rounded-[16px] border border-[#E8EAED] bg-white p-4 shadow-sm lg:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-[#111827]">Hashtags</h3>
                    <button
                      type="button"
                      onClick={() => void copyText("hashtags", result.hashtags!.join(" "))}
                      className={cn(AFFILIATE_BTN_SECONDARY, "h-8 px-2.5 text-[11px]")}
                    >
                      Copy all
                    </button>
                  </div>
                  <textarea
                    value={result.hashtags.join(" ")}
                    onChange={(event) =>
                      setResult((current) =>
                        current
                          ? {
                              ...current,
                              hashtags: event.target.value.split(/\s+/).filter(Boolean),
                            }
                          : current,
                      )
                    }
                    rows={2}
                    className="mb-2 w-full resize-y rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-[13px] leading-relaxed text-[#4B5563] outline-none focus:border-[#FF5A1F]/40"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {result.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-[#FFF8F5] px-2 py-1 text-[12px] font-semibold text-[#FF5A1F]"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {result.keywords ? (
                <div className="rounded-[16px] border border-[#E8EAED] bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-[13px] font-bold text-[#111827]">Keywords</h3>
                  <textarea
                    value={result.keywords.join(", ")}
                    onChange={(event) =>
                      setResult((current) =>
                        current
                          ? {
                              ...current,
                              keywords: event.target.value
                                .split(",")
                                .map((word) => word.trim())
                                .filter(Boolean),
                            }
                          : current,
                      )
                    }
                    rows={2}
                    className="w-full resize-y rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-[13px] leading-relaxed text-[#4B5563] outline-none focus:border-[#FF5A1F]/40"
                  />
                </div>
              ) : null}

              {result.hooks ? (
                <div className="rounded-[16px] border border-[#E8EAED] bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-[13px] font-bold text-[#111827]">Hooks</h3>
                  <div className="space-y-2">
                    {result.hooks.map((hook, index) => (
                      <textarea
                        key={`hook-${index}`}
                        value={hook}
                        onChange={(event) =>
                          setResult((current) => {
                            if (!current?.hooks) return current;
                            const hooks = [...current.hooks];
                            hooks[index] = event.target.value;
                            return { ...current, hooks };
                          })
                        }
                        rows={2}
                        className="w-full resize-y rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-[13px] leading-relaxed text-[#4B5563] outline-none focus:border-[#FF5A1F]/40"
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {result.scripts ? (
                <div className="rounded-[16px] border border-[#E8EAED] bg-white p-4 shadow-sm lg:col-span-2">
                  <h3 className="mb-2 text-[13px] font-bold text-[#111827]">Scripts</h3>
                  <div className="space-y-2">
                    {result.scripts.map((script, index) => (
                      <textarea
                        key={`script-${index}`}
                        value={script}
                        onChange={(event) =>
                          setResult((current) => {
                            if (!current?.scripts) return current;
                            const scripts = [...current.scripts];
                            scripts[index] = event.target.value;
                            return { ...current, scripts };
                          })
                        }
                        rows={3}
                        className="w-full resize-y rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-[13px] leading-relaxed text-[#4B5563] outline-none focus:border-[#FF5A1F]/40"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-10 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-[#FF5A1F]" />
              <p className="mt-3 text-[14px] font-bold text-[#111827]">Ready when you are</p>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                Generate with Jimvio AI, or draft editable copy from the listing. Nothing is posted for you.
              </p>
            </div>
          )}
        </div>
      )}
    </AffiliatePageShell>
  );
}
