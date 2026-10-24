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

const FIELDS: Array<{ key: keyof PromoResult; label: string }> = [
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
  const [pending, startTransition] = useTransition();

  const selected = products.find((p) => p.id === selectedId) ?? products[0];

  useEffect(() => {
    if (!selectedId && products[0]) setSelectedId(products[0].id);
  }, [products, selectedId]);

  const generate = useCallback(() => {
    if (!selected) return;
    startTransition(async () => {
      setError(null);
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

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <AffiliatePageShell
      title="AI Promotion"
      subtitle="Generate TikTok, Instagram, YouTube, Facebook, Threads, X, email, blog, SEO, hashtags, hooks, and scripts."
      actions={
        <button
          type="button"
          onClick={generate}
          disabled={pending || !selected}
          className={cn(AFFILIATE_BTN_PRIMARY, "h-10 px-3.5 text-[12.5px] disabled:opacity-60")}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate assets
        </button>
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
              {FIELDS.map(({ key, label }) => {
                const value = result[key];
                if (typeof value !== "string" || !value) return null;
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
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#4B5563]">
                      {value}
                    </p>
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

              {result.keywords?.length ? (
                <div className="rounded-[16px] border border-[#E8EAED] bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-[13px] font-bold text-[#111827]">Keywords</h3>
                  <p className="text-[13px] text-[#4B5563]">{result.keywords.join(", ")}</p>
                </div>
              ) : null}

              {result.hooks?.length ? (
                <div className="rounded-[16px] border border-[#E8EAED] bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-[13px] font-bold text-[#111827]">Hooks</h3>
                  <ul className="space-y-1.5 text-[13px] text-[#4B5563]">
                    {result.hooks.map((h) => (
                      <li key={h}>• {h}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.scripts?.length ? (
                <div className="rounded-[16px] border border-[#E8EAED] bg-white p-4 shadow-sm lg:col-span-2">
                  <h3 className="mb-2 text-[13px] font-bold text-[#111827]">Scripts</h3>
                  <div className="space-y-3">
                    {result.scripts.map((s, i) => (
                      <div key={i} className="rounded-xl bg-[#F9FAFB] p-3 text-[13px] leading-relaxed text-[#4B5563]">
                        {s}
                      </div>
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
                Select a product and generate a full promotional kit in one click.
              </p>
            </div>
          )}
        </div>
      )}
    </AffiliatePageShell>
  );
}
