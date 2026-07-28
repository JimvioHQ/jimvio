"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Share2,
  Sparkles,
} from "lucide-react";
import { AFFILIATE_BTN_PRIMARY, AFFILIATE_BTN_SECONDARY, formatAffiliateMoney } from "./sections/shared";
import { cn } from "@/lib/utils";

export type AffiliatePromoteProductView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: string[];
  category: string;
  price: number;
  currency: string;
  rate: number;
  avgEarning: number;
  sellerName: string | null;
  verified: boolean;
};

type AffiliatePromoteProductClientProps = {
  product: AffiliatePromoteProductView;
  affiliateLink: string | null;
  linkCode: string | null;
  needsAuth: boolean;
  needsAffiliate: boolean;
  activateHref: string;
  loginHref: string;
};

export function AffiliatePromoteProductClient({
  product,
  affiliateLink: initialLink,
  linkCode: initialCode,
  needsAuth,
  needsAffiliate,
  activateHref,
  loginHref,
}: AffiliatePromoteProductClientProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [affiliateLink, setAffiliateLink] = useState(initialLink);
  const [linkCode, setLinkCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const images = product.images.length > 0 ? product.images : ["/images/default-profile.png"];
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const shareUrl = useMemo(
    () => affiliateLink ?? `${origin}/marketplace/${product.slug}`,
    [affiliateLink, origin, product.slug]
  );

  useEffect(() => {
    let cancelled = false;
    if (!affiliateLink) {
      setQrDataUrl(null);
      return;
    }
    void import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(affiliateLink, {
          width: 180,
          margin: 1,
          color: { dark: "#111827", light: "#FFFFFF" },
        })
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [affiliateLink]);

  const ensureLink = useCallback(async () => {
    if (affiliateLink) return affiliateLink;
    if (needsAuth || needsAffiliate) return null;

    const res = await fetch("/api/affiliates/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        destinationUrl: `${window.location.origin}/marketplace/${product.slug}`,
        commissionRate: product.rate,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.link) {
      setError(data?.error ?? "Could not create affiliate link");
      return null;
    }
    const code = String(data.link.link_code ?? "");
    const url =
      typeof data.link.full_url === "string" && data.link.full_url.startsWith("http")
        ? data.link.full_url
        : `${window.location.origin}/ref/${code}`;
    setAffiliateLink(url);
    setLinkCode(code);
    return url;
  }, [affiliateLink, needsAffiliate, needsAuth, product.id, product.rate, product.slug]);

  const onCopy = () => {
    startTransition(async () => {
      setError(null);
      const url = await ensureLink();
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        setError("Could not copy link");
      }
    });
  };

  const onShare = () => {
    startTransition(async () => {
      setError(null);
      const url = await ensureLink();
      if (!url) return;
      if (navigator.share) {
        try {
          await navigator.share({
            title: product.name,
            text: `Check out ${product.name} on Jimvio`,
            url,
          });
          return;
        } catch {
          // fall through to copy
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        setError("Could not share link");
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
      <Link
        href="/affiliates"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6B7280] transition-colors hover:text-[#FF5A1F]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Affiliate Hub
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        {/* Media */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[18px] border border-[#E8EAED] bg-white shadow-[0_8px_28px_rgba(17,24,39,0.06)]">
            <Image
              src={images[activeImage] ?? images[0]}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 520px"
              priority
              unoptimized
            />
            <span className="absolute left-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
              {Math.round(product.rate)}% commission
            </span>
          </div>
          {images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.slice(0, 6).map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                    i === activeImage
                      ? "border-[#FF5A1F] shadow-[0_4px_12px_rgba(255,90,31,0.25)]"
                      : "border-transparent opacity-80 hover:opacity-100"
                  )}
                  aria-label={`View image ${i + 1}`}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="64px" unoptimized />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Details + link tools */}
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">
              {product.category}
            </p>
            <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-[#111827] sm:text-[30px]">
              {product.name}
            </h1>
            {product.sellerName ? (
              <p className="mt-2 text-[13px] text-[#6B7280]">
                Sold by{" "}
                <span className="font-semibold text-[#111827]">{product.sellerName}</span>
                {product.verified ? " · Verified" : ""}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#E8EAED] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-medium text-[#9CA3AF]">Price</p>
              <p className="mt-1 text-[18px] font-bold tabular-nums text-[#111827]">
                {formatAffiliateMoney(product.price, product.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#FFE4D6] bg-[#FFF8F5] p-4 shadow-sm">
              <p className="text-[11px] font-medium text-[#FF5A1F]">Your commission</p>
              <p className="mt-1 text-[18px] font-bold tabular-nums text-[#FF5A1F]">
                {formatAffiliateMoney(product.avgEarning, product.currency)}
              </p>
              <p className="mt-0.5 text-[11px] text-[#6B7280]">
                {Math.round(product.rate)}% per sale
              </p>
            </div>
          </div>

          {product.description ? (
            <div className="rounded-2xl border border-[#E8EAED] bg-white p-4">
              <h2 className="text-[14px] font-bold text-[#111827]">Product information</h2>
              <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#4B5563]">
                {product.description}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#FFE4D6] bg-white p-4 shadow-[0_8px_24px_rgba(255,90,31,0.08)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFF0E8]">
                <Link2 className="h-4 w-4 text-[#FF5A1F]" />
              </span>
              <div>
                <h2 className="text-[14px] font-bold text-[#111827]">Your affiliate link</h2>
                <p className="text-[12px] text-[#6B7280]">
                  Share this tracked link to earn commission
                </p>
              </div>
            </div>

            {needsAuth ? (
              <div className="space-y-3">
                <p className="text-[13px] text-[#4B5563]">
                  Sign in to generate your personal affiliate link for this product.
                </p>
                <Link href={loginHref} className={cn(AFFILIATE_BTN_PRIMARY, "h-11 w-full px-4 text-[13px]")}>
                  Sign in to get link
                </Link>
              </div>
            ) : needsAffiliate ? (
              <div className="space-y-3">
                <p className="text-[13px] text-[#4B5563]">
                  Activate affiliate access to unlock tracked links and commissions.
                </p>
                <Link href={activateHref} className={cn(AFFILIATE_BTN_PRIMARY, "h-11 w-full px-4 text-[13px]")}>
                  Activate affiliate access
                </Link>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3">
                  <p className="break-all font-mono text-[12.5px] leading-relaxed text-[#111827]">
                    {affiliateLink ?? "Generating your tracked link…"}
                  </p>
                  {linkCode ? (
                    <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
                      Tracking code: <span className="font-semibold text-[#6B7280]">{linkCode}</span>
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={onCopy}
                    disabled={pending}
                    className={cn(AFFILIATE_BTN_PRIMARY, "h-11 flex-1 px-4 text-[13px] disabled:opacity-60")}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy Link"}
                  </button>
                  <button
                    type="button"
                    onClick={onShare}
                    disabled={pending}
                    className={cn(AFFILIATE_BTN_SECONDARY, "h-11 flex-1 px-4 text-[13px] disabled:opacity-60")}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>
                {qrDataUrl ? (
                  <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-[#E8EAED] bg-[#F9FAFB] p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR */}
                    <img src={qrDataUrl} alt="Affiliate link QR code" className="h-[140px] w-[140px] rounded-lg" />
                    <p className="text-[11px] font-medium text-[#6B7280]">Scan to open your tracked link</p>
                  </div>
                ) : null}
                {!affiliateLink ? (
                  <button
                    type="button"
                    onClick={() => startTransition(() => void ensureLink())}
                    disabled={pending}
                    className="mt-2 text-[12px] font-semibold text-[#FF5A1F] hover:underline disabled:opacity-60"
                  >
                    {pending ? "Creating link…" : "Generate affiliate link"}
                  </button>
                ) : null}
              </>
            )}
            {error ? <p className="mt-2 text-[12px] font-medium text-red-600">{error}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E8EAED] bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FF5A1F]" />
                <h3 className="text-[13px] font-bold text-[#111827]">Marketing assets</h3>
              </div>
              <ul className="space-y-1.5 text-[12.5px] text-[#4B5563]">
                <li>• Product images above — use in posts and stories</li>
                <li>• Lead with the {Math.round(product.rate)}% commission angle</li>
                <li>• Pair short captions with your tracked link / QR</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#E8EAED] bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-[#FF5A1F]" />
                <h3 className="text-[13px] font-bold text-[#111827]">Tracking</h3>
              </div>
              <ul className="space-y-1.5 text-[12.5px] text-[#4B5563]">
                <li>• Clicks attributed via `/ref/` cookie</li>
                <li>• Sales credit after order confirmation</li>
                <li>• View performance in Analytics</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8EAED] bg-[#F8FAFC] p-4">
            <h3 className="text-[13px] font-bold text-[#111827]">How to promote</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[12.5px] leading-relaxed text-[#4B5563]">
              <li>Copy your affiliate link above.</li>
              <li>Share it on social, communities, or with your audience.</li>
              <li>Earn {Math.round(product.rate)}% when someone buys through your link.</li>
              <li>Track clicks and conversions from your affiliate dashboard.</li>
            </ol>
            <Link
              href={shareUrl.startsWith("http") ? shareUrl : `/marketplace/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#FF5A1F] hover:underline"
            >
              Open product storefront
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
