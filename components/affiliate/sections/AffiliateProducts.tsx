"use client";

import Image from "next/image";
import Link from "next/link";
import {
  memo,
  useCallback,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  Heart,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toggleWishlist } from "@/lib/actions/marketplace";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_CARD,
  AFFILIATE_LINK,
  AFFILIATE_SHELL,
  AffiliateSectionHeading,
  fadeUp,
  formatAffiliateMoney,
  staggerContainer,
  type AffiliateSpotlightProduct,
} from "./shared";
import { cn } from "@/lib/utils";

type AffiliateProductsProps = {
  products: AffiliateSpotlightProduct[];
};

const ProductCard = memo(function ProductCard({
  product,
}: {
  product: AffiliateSpotlightProduct;
}) {
  const [wishlisted, setWishlisted] = useState(false);
  const [pending, startTransition] = useTransition();
  const commissionPct =
    typeof product.rate === "number" && Number.isFinite(product.rate) && product.rate > 0
      ? Math.round(product.rate)
      : product.price > 0 && product.avgEarning > 0
        ? Math.round((product.avgEarning / product.price) * 100)
        : null;

  const onWishlist = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !wishlisted;
      setWishlisted(next);
      startTransition(async () => {
        try {
          const res = await toggleWishlist(product.id);
          if (!res.success) {
            setWishlisted(!next);
            return;
          }
          if (typeof res.inWishlist === "boolean") {
            setWishlisted(res.inWishlist);
          }
        } catch {
          setWishlisted(!next);
        }
      });
    },
    [product.id, wishlisted]
  );

  return (
    <article
      className={cn(
        AFFILIATE_CARD,
        "group relative flex h-full flex-col overflow-hidden",
        "transition-all duration-200 ease-out will-change-transform",
        "hover:-translate-y-1.5 hover:border-[#FF5A1F]/35",
        "hover:shadow-[0_16px_36px_rgba(17,24,39,0.12)]",
        "focus-within:ring-2 focus-within:ring-[#FF5A1F]/25 focus-within:ring-offset-2",
        "motion-reduce:hover:translate-y-0"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F8FAFC]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          loading="lazy"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.06] motion-reduce:group-hover:scale-100"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          unoptimized
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-60"
        />

        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          disabled={pending}
          onClick={onWishlist}
          className={cn(
            "absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full",
            "border border-white/70 bg-white/85 text-[#6B7280] shadow-sm backdrop-blur-md",
            "transition-all duration-200 hover:scale-105 hover:text-[#FF5A1F]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
            "disabled:opacity-60 motion-reduce:hover:scale-100",
            wishlisted && "text-[#FF5A1F]"
          )}
        >
          <Heart
            className="h-3.5 w-3.5"
            strokeWidth={2.2}
            fill={wishlisted ? "currentColor" : "none"}
          />
        </button>

        <Link
          href={`/affiliates/promote/${product.slug}`}
          aria-label={`Quick preview ${product.name}`}
          className={cn(
            "absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full",
            "border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#111827] backdrop-blur-md",
            "opacity-0 translate-y-2 transition-all duration-200",
            "group-hover:translate-y-0 group-hover:opacity-100",
            "focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
            "motion-reduce:translate-y-0 motion-reduce:opacity-100"
          )}
        >
          <Eye className="h-3 w-3" />
          Preview
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <Link
          href={`/affiliates/promote/${product.slug}`}
          className="line-clamp-2 min-h-[2.4rem] text-[13px] font-semibold leading-snug text-[#111827] transition-colors duration-200 hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/30 rounded-sm"
        >
          {product.name}
        </Link>

        {product.verified ? (
          <span className="mt-1.5 inline-flex w-fit items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
            <BadgeCheck className="h-3 w-3" strokeWidth={2.4} />
            Verified
          </span>
        ) : null}

        <div className="mt-2.5 border-t border-[#F3F4F6] pt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
            Per Sale
          </p>
          <p className="mt-0.5 text-[15px] font-bold tabular-nums leading-none text-[#FF5A1F]">
            {formatAffiliateMoney(product.avgEarning, product.currency)}
          </p>
          {commissionPct != null ? (
            <span className="mt-2 inline-flex rounded-full bg-[#FF5A1F]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF5A1F] ring-1 ring-[#FF5A1F]/20">
              {commissionPct}% Commission
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-auto pt-3 translate-y-1 opacity-95 transition-all duration-200",
            "group-hover:translate-y-0 group-hover:opacity-100",
            "motion-reduce:translate-y-0"
          )}
        >
          <Link
            href={`/affiliates/promote/${product.slug}`}
            className={cn(
              AFFILIATE_BTN_PRIMARY,
              "h-9 w-full px-3 text-[12px] shadow-[0_4px_14px_rgba(255,90,31,0.22)]"
            )}
          >
            Promote Now
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </article>
  );
});

export function AffiliateProducts({
  products,
}: AffiliateProductsProps) {
  const display = products.slice(0, 10);
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section className={`${AFFILIATE_SHELL} pt-12 sm:pt-14`} id="creatives">
      <AffiliateSectionHeading
        title="Products to Promote Now"
        subtitle="High-converting products with live commission rates."
        action={
          <Link href="/marketplace" className={cn(AFFILIATE_LINK, "text-[13.5px]")}>
            View Full Catalog
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        }
      />

      {display.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white py-16 text-center text-[14px] text-[#6B7280]">
          Affiliate-enabled products are loading into the catalog. Check back
          soon or browse the marketplace.
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5"
          initial={reduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          variants={staggerContainer}
        >
          {display.map((product) => (
            <motion.div key={product.id} variants={fadeUp} className="h-full">
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="mt-8 flex justify-center">
        <Link
          href="/marketplace"
          className={cn(AFFILIATE_BTN_PRIMARY, "h-11 px-7 text-[14px]")}
        >
          Explore More Products
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}
