import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  AFFILIATE_CARD,
  AFFILIATE_SHELL,
  AffiliateSectionHeading,
  formatAffiliateMoney,
  type AffiliateSpotlightProduct,
} from "./shared";
import { cn } from "@/lib/utils";

type AffiliateProductsProps = {
  products: AffiliateSpotlightProduct[];
};

function ProductCard({ product }: { product: AffiliateSpotlightProduct }) {
  return (
    <Link
      href={`/marketplace/${product.slug}`}
      className={cn(
        AFFILIATE_CARD,
        "group overflow-hidden transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-[#fd5000]/30 hover:shadow-[0_10px_28px_rgba(17,24,39,0.08)]"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F8FAFC]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 20vw, 200px"
          unoptimized
        />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-[2px]">
          {Math.round(product.rate)}%
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
          {product.category}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.4rem] text-[13px] font-semibold leading-snug text-[#111827] transition-colors group-hover:text-[#fd5000]">
          {product.name}
        </h3>
        <div className="mt-2.5 flex items-center justify-between border-t border-[#F3F4F6] pt-2.5 text-[11.5px]">
          <span className="text-[#9CA3AF]">Per sale</span>
          <span className="font-bold tabular-nums text-[#111827]">
            {formatAffiliateMoney(product.avgEarning, product.currency)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AffiliateProducts({ products }: AffiliateProductsProps) {
  const display = products.slice(0, 10);

  return (
    <section className={`${AFFILIATE_SHELL} pt-12 sm:pt-14`} id="creatives">
      <AffiliateSectionHeading
        title="Products to Promote Now"
        subtitle="High-converting products with live commission rates."
        action={
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[#fd5000] transition-opacity hover:opacity-80"
          >
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
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 sm:gap-4">
          {display.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Link
          href="/marketplace"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#fd5000] px-7 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(253,80,0,0.28)] transition-colors hover:bg-[#e04700]"
        >
          Explore More Products
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}
