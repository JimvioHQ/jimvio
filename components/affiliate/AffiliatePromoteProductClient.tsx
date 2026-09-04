"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Calculator,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_BTN_SECONDARY,
  formatAffiliateMoney,
} from "./sections/shared";
import { cn } from "@/lib/utils";

export type AffiliatePromoteProductView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  images: string[];
  videoUrl: string | null;
  features: string[];
  benefits: string[];
  category: string;
  brand: string | null;
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
  initialPicked?: boolean;
  initialLinkError?: string | null;
  needsAuth: boolean;
  needsAffiliate: boolean;
  activateHref: string;
  loginHref: string;
};

type PromoKit = {
  captions?: string;
  hashtags?: string[];
  hooks?: string[];
  scripts?: string[];
  tiktokCaption?: string;
  instagramCaption?: string;
};

const FAQS = [
  {
    q: "How do I get paid?",
    a: "When someone buys through your tracked link, commission moves Pending → Approved → Paid after order confirmation.",
  },
  {
    q: "What is a deep link?",
    a: "Deep links open the product directly in Jimvio apps or browsers while preserving your affiliate attribution cookie.",
  },
  {
    q: "Can I share a QR code?",
    a: "Yes. Scan-to-open QR codes point to your short /ref/ link so offline and print placements still track.",
  },
  {
    q: "Where do I see clicks?",
    a: "Open Affiliate Dashboard or Link Manager for live clicks, conversions, and earnings per link.",
  },
];

export function AffiliatePromoteProductClient({
  product,
  affiliateLink: initialLink,
  linkCode: initialCode,
  initialPicked = false,
  initialLinkError = null,
  needsAuth,
  needsAffiliate,
  activateHref,
  loginHref,
}: AffiliatePromoteProductClientProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [affiliateLink, setAffiliateLink] = useState(initialLink);
  const [linkCode, setLinkCode] = useState(initialCode);
  const [picked, setPicked] = useState(Boolean(initialPicked && initialLink));
  const [pickNotice, setPickNotice] = useState<string | null>(
    initialPicked && initialLink ? "Product added" : null
  );
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialLinkError);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sales, setSales] = useState(10);
  const [pending, startTransition] = useTransition();
  const [ensuring, setEnsuring] = useState(false);
  const [promo, setPromo] = useState<PromoKit | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [track, setTrack] = useState<{ clicks: number; conversions: number; earnings: number } | null>(
    null
  );
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const images = product.images.length > 0 ? product.images : ["/images/default-profile.png"];
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const shortLink = useMemo(() => {
    if (!linkCode) return affiliateLink;
    return `${origin || ""}/ref/${linkCode}`;
  }, [affiliateLink, linkCode, origin]);

  const estimated = product.avgEarning * Math.max(0, sales);

  useEffect(() => {
    let cancelled = false;
    if (!shortLink) {
      setQrDataUrl(null);
      return;
    }
    void import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(shortLink, {
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
  }, [shortLink]);

  useEffect(() => {
    if (needsAuth || needsAffiliate || !linkCode) return;
    let cancelled = false;
    void fetch("/api/affiliates/links?all=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.links) return;
        const mine = (data.links as Array<{
          linkCode: string;
          clicks: number;
          conversions: number;
          earnings: number;
        }>).find((l) => l.linkCode === linkCode);
        if (mine) {
          setTrack({
            clicks: mine.clicks,
            conversions: mine.conversions,
            earnings: mine.earnings,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [needsAuth, needsAffiliate, linkCode]);

  const ensureLink = useCallback(async (): Promise<{ url: string; code: string } | null> => {
    if (affiliateLink && linkCode) {
      setPicked(true);
      return { url: affiliateLink, code: linkCode };
    }
    if (needsAuth || needsAffiliate) return null;

    setEnsuring(true);
    setError(null);
    try {
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
        const msg =
          typeof data?.error === "string" && data.error.length < 160
            ? data.error
            : "Could not create affiliate link";
        setError(msg);
        setPicked(false);
        return null;
      }
      const code = String(data.link.link_code ?? "");
      const url =
        typeof data.link.short_url === "string" && data.link.short_url.startsWith("http")
          ? data.link.short_url
          : typeof data.link.full_url === "string" && data.link.full_url.startsWith("http")
            ? data.link.full_url
            : `${window.location.origin}/ref/${code}`;
      if (!code) {
        setError("Could not create affiliate link");
        return null;
      }
      setAffiliateLink(url);
      setLinkCode(code);
      setPicked(true);
      setPickNotice("Product added");
      window.setTimeout(() => setPickNotice(null), 2800);
      return { url, code };
    } finally {
      setEnsuring(false);
    }
  }, [
    affiliateLink,
    linkCode,
    needsAffiliate,
    needsAuth,
    product.id,
    product.rate,
    product.slug,
  ]);

  // Auto-recover when SSR create failed or link is missing.
  useEffect(() => {
    if (needsAuth || needsAffiliate) return;
    if (affiliateLink && linkCode) return;
    let cancelled = false;
    startTransition(() => {
      void ensureLink().then((result) => {
        if (cancelled || !result) return;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAuth, needsAffiliate, product.id]);

  const copyValue = async (key: string, value: string) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Could not copy");
    }
  };

  const onCopyLink = () => {
    startTransition(async () => {
      const result = await ensureLink();
      if (!result?.code) return;
      const full = `${window.location.origin}/ref/${result.code}`;
      await copyValue("link", full);
    });
  };

  const onShare = () => {
    startTransition(async () => {
      const result = await ensureLink();
      if (!result) return;
      const shareUrl = `${window.location.origin}/ref/${result.code}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: product.name,
            text: `Check out ${product.name} on Jimvio`,
            url: shareUrl,
          });
          return;
        } catch {
          /* fall through */
        }
      }
      await copyValue("link", shareUrl);
    });
  };

  const generateAi = () => {
    startTransition(async () => {
      setPromoBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "affiliate_promotion",
            productName: product.name,
            category: product.category,
            price: product.price,
            currency: "USD",
            commissionRate: product.rate,
            features: product.features,
            description: product.description || product.shortDescription,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "AI generation failed — sign in to continue");
          return;
        }
        setPromo(data?.data ?? null);
      } catch {
        setError("Could not generate AI assets");
      } finally {
        setPromoBusy(false);
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
        {/* Hero gallery + video */}
        <div className="space-y-4">
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
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.slice(0, 8).map((src, i) => (
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

          {product.videoUrl ? (
            <div className="overflow-hidden rounded-[18px] border border-[#E8EAED] bg-black shadow-sm">
              <video
                src={product.videoUrl}
                controls
                playsInline
                className="aspect-video w-full"
                poster={images[0]}
              />
            </div>
          ) : null}

          <Section title="Product description">
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#4B5563]">
              {product.description ||
                product.shortDescription ||
                "Premium product ready for creator-led promotion."}
            </p>
          </Section>

          {product.benefits.length > 0 ? (
            <Section title="Benefits">
              <ul className="space-y-1.5 text-[13px] text-[#4B5563]">
                {product.benefits.map((b) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {product.features.length > 0 ? (
            <Section title="Features">
              <ul className="grid gap-1.5 sm:grid-cols-2 text-[13px] text-[#4B5563]">
                {product.features.map((f) => (
                  <li key={f} className="rounded-lg bg-[#F9FAFB] px-2.5 py-2">
                    {f}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">
              {product.category}
            </p>
            <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-[#111827] sm:text-[30px]">
              {product.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[#6B7280]">
              {product.sellerName || product.brand ? (
                <span>
                  Brand{" "}
                  <span className="font-semibold text-[#111827]">
                    {product.brand || product.sellerName}
                  </span>
                </span>
              ) : null}
              {product.verified ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#E8EAED] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-medium text-[#9CA3AF]">Price</p>
              <p className="mt-1 text-[18px] font-bold tabular-nums text-[#111827]">
                {formatAffiliateMoney(product.price, product.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#FFE4D6] bg-[#FFF8F5] p-4 shadow-sm">
              <p className="text-[11px] font-medium text-[#FF5A1F]">Commission rate</p>
              <p className="mt-1 text-[18px] font-bold tabular-nums text-[#FF5A1F]">
                {Math.round(product.rate)}%
              </p>
              <p className="mt-0.5 text-[11px] text-[#6B7280]">
                {formatAffiliateMoney(product.avgEarning, product.currency)} / sale
              </p>
            </div>
          </div>

          <Section title="Estimated earnings calculator" icon={<Calculator className="h-4 w-4 text-[#FF5A1F]" />}>
            <label className="text-[12px] font-medium text-[#6B7280]">
              Expected sales: <span className="font-bold text-[#111827]">{sales}</span>
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={sales}
              onChange={(e) => setSales(Number(e.target.value))}
              className="mt-2 w-full accent-[#FF5A1F]"
            />
            <p className="mt-2 text-[20px] font-bold tabular-nums text-[#FF5A1F]">
              {formatAffiliateMoney(estimated, product.currency)}
            </p>
            <p className="text-[11px] text-[#9CA3AF]">
              Based on {Math.round(product.rate)}% commission × {sales} sales
            </p>
          </Section>

          <div className="rounded-2xl border border-[#FFE4D6] bg-white p-4 shadow-[0_8px_24px_rgba(255,90,31,0.08)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFF0E8]">
                  <Link2 className="h-4 w-4 text-[#FF5A1F]" />
                </span>
                <div>
                  <h2 className="text-[14px] font-bold text-[#111827]">Affiliate link</h2>
                  <p className="text-[12px] text-[#6B7280]">Short link · deep link · QR · share</p>
                </div>
              </div>
              {picked && linkCode ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Picked ✓
                </span>
              ) : null}
            </div>

            {pickNotice ? (
              <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] font-semibold text-emerald-700">
                {pickNotice}
              </p>
            ) : null}

            {needsAuth ? (
              <Gate href={loginHref} label="Sign in to get link" copy="Sign in to generate your personal tracked link." />
            ) : needsAffiliate ? (
              <Gate
                href={activateHref}
                label="Activate affiliate access"
                copy="Activate affiliate access to unlock tracked links and commissions."
              />
            ) : (
              <>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3">
                  <p className="break-all font-mono text-[12.5px] leading-relaxed text-[#111827]">
                    {shortLink || affiliateLink || (ensuring || pending ? "Picking…" : "Generating your tracked link…")}
                  </p>
                  {linkCode ? (
                    <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
                      Tracking code: <span className="font-semibold text-[#6B7280]">{linkCode}</span>
                    </p>
                  ) : ensuring || pending ? (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280]">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Creating your tracked product link…
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={onCopyLink}
                    disabled={pending || ensuring || (!shortLink && !affiliateLink)}
                    className={cn(AFFILIATE_BTN_PRIMARY, "h-11 flex-1 px-4 text-[13px] disabled:opacity-60")}
                  >
                    {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === "link" ? "Link copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={onShare}
                    disabled={pending || ensuring}
                    className={cn(AFFILIATE_BTN_SECONDARY, "h-11 flex-1 px-4 text-[13px] disabled:opacity-60")}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      startTransition(async () => {
                        const result = await ensureLink();
                        if (!result?.code) return;
                        await copyValue(
                          "deep",
                          `jimvio://product/${product.slug}?ref=${encodeURIComponent(result.code)}`
                        );
                      });
                    }}
                    disabled={pending || ensuring}
                    className={cn(AFFILIATE_BTN_SECONDARY, "h-9 px-3 text-[12px] disabled:opacity-60")}
                  >
                    {copied === "deep" ? "Deep link copied" : "Copy deep link"}
                  </button>
                  <Link
                    href="/affiliates/links"
                    className="inline-flex h-9 items-center px-1 text-[12px] font-semibold text-[#FF5A1F] hover:underline"
                  >
                    View picked products →
                  </Link>
                  {!affiliateLink || !linkCode ? (
                    <button
                      type="button"
                      onClick={() => startTransition(() => void ensureLink())}
                      disabled={pending || ensuring}
                      className="text-[12px] font-semibold text-[#FF5A1F] hover:underline disabled:opacity-60"
                    >
                      {pending || ensuring ? "Picking…" : "Pick product"}
                    </button>
                  ) : null}
                </div>
                {qrDataUrl ? (
                  <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-[#E8EAED] bg-[#F9FAFB] p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Affiliate QR" className="h-[140px] w-[140px] rounded-lg" />
                    <p className="text-[11px] font-medium text-[#6B7280]">QR code → tracked short link</p>
                  </div>
                ) : null}
              </>
            )}
            {error ? <p className="mt-2 text-[12px] font-medium text-red-600">{error}</p> : null}
          </div>

          <Section title="Tracking dashboard">
            {track ? (
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Clicks" value={String(track.clicks)} />
                <MiniStat label="Conversions" value={String(track.conversions)} />
                <MiniStat
                  label="Earnings"
                  value={formatAffiliateMoney(track.earnings, product.currency)}
                />
              </div>
            ) : (
              <p className="text-[13px] text-[#6B7280]">
                Live stats appear after your link is created.{" "}
                <Link href="/affiliates/dashboard" className="font-semibold text-[#FF5A1F]">
                  Open dashboard
                </Link>
              </p>
            )}
          </Section>

          <Section
            title="Marketing assets · AI captions"
            icon={<Sparkles className="h-4 w-4 text-[#FF5A1F]" />}
          >
            <button
              type="button"
              onClick={generateAi}
              disabled={promoBusy || needsAuth}
              className={cn(AFFILIATE_BTN_PRIMARY, "h-10 w-full px-4 text-[13px] disabled:opacity-60")}
            >
              {promoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate captions, hashtags, hooks & scripts
            </button>
            {promo ? (
              <div className="mt-3 space-y-3">
                {(promo.tiktokCaption || promo.instagramCaption) && (
                  <AssetBlock
                    label="Captions"
                    text={[promo.tiktokCaption, promo.instagramCaption].filter(Boolean).join("\n\n")}
                    onCopy={(t) => copyValue("cap", t)}
                    copied={copied === "cap"}
                  />
                )}
                {promo.hashtags?.length ? (
                  <AssetBlock
                    label="Hashtags"
                    text={promo.hashtags.join(" ")}
                    onCopy={(t) => copyValue("hash", t)}
                    copied={copied === "hash"}
                  />
                ) : null}
                {promo.hooks?.length ? (
                  <AssetBlock
                    label="Hooks"
                    text={promo.hooks.map((h) => `• ${h}`).join("\n")}
                    onCopy={(t) => copyValue("hooks", t)}
                    copied={copied === "hooks"}
                  />
                ) : null}
                {promo.scripts?.length ? (
                  <AssetBlock
                    label="Scripts"
                    text={promo.scripts.join("\n\n")}
                    onCopy={(t) => copyValue("scripts", t)}
                    copied={copied === "scripts"}
                  />
                ) : null}
                <Link href="/affiliates/ai" className="inline-flex text-[12px] font-semibold text-[#FF5A1F]">
                  Open full AI Promotion studio →
                </Link>
              </div>
            ) : (
              <ul className="mt-3 space-y-1.5 text-[12.5px] text-[#4B5563]">
                <li>• Use gallery images in posts and stories</li>
                <li>• Lead with the {Math.round(product.rate)}% commission angle</li>
                <li>• Pair short captions with your tracked link / QR</li>
              </ul>
            )}
          </Section>

          <Section title="FAQs">
            <div className="space-y-1">
              {FAQS.map((faq, i) => (
                <div key={faq.q} className="rounded-xl border border-[#F3F4F6]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                  >
                    <span className="text-[13px] font-semibold text-[#111827]">{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-[#9CA3AF] transition-transform",
                        openFaq === i && "rotate-180"
                      )}
                    />
                  </button>
                  {openFaq === i ? (
                    <p className="border-t border-[#F3F4F6] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#6B7280]">
                      {faq.a}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>

          <div className="rounded-2xl border border-[#E8EAED] bg-[#F8FAFC] p-4">
            <h3 className="text-[13px] font-bold text-[#111827]">How to promote</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[12.5px] leading-relaxed text-[#4B5563]">
              <li>Copy your affiliate link or QR above.</li>
              <li>Use AI captions/hooks on social and communities.</li>
              <li>Earn {Math.round(product.rate)}% when someone buys through your link.</li>
              <li>Track performance in Dashboard and Link Manager.</li>
            </ol>
            <Link
              href={`/marketplace/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#FF5A1F] hover:underline"
            >
              Preview storefront (optional)
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E8EAED] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h2 className="text-[14px] font-bold text-[#111827]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] px-2.5 py-2 text-center">
      <p className="text-[10px] font-medium uppercase text-[#9CA3AF]">{label}</p>
      <p className="mt-0.5 text-[14px] font-bold tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}

function Gate({ href, label, copy }: { href: string; label: string; copy: string }) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[#4B5563]">{copy}</p>
      <Link href={href} className={cn(AFFILIATE_BTN_PRIMARY, "h-11 w-full px-4 text-[13px]")}>
        {label}
      </Link>
    </div>
  );
}

function AssetBlock({
  label,
  text,
  onCopy,
  copied,
}: {
  label: string;
  text: string;
  onCopy: (t: string) => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[12px] font-bold text-[#111827]">{label}</p>
        <button
          type="button"
          onClick={() => onCopy(text)}
          className="text-[11px] font-semibold text-[#FF5A1F]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#4B5563]">{text}</p>
    </div>
  );
}
