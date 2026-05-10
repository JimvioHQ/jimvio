import Link from "next/link";
import { Flame, TrendingUp, ChevronRight, ShoppingBag, Tag } from "lucide-react";
import type { Product } from "@/types/dashboard";

export function TrendingProducts({ products }: { products: Product[] }) {
  const getSoldCount = (sold: string): number => {
    const cleaned = sold.replace(/[^\d]/g, "");
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#fd5000]/10 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-[#fd5000]" />
          </div>
          <span className="text-[13px] font-bold text-text-primary">Trending Products</span>
          {products.length > 0 && (
            <span className="text-[10px] font-semibold text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded-full">
              {products.length}
            </span>
          )}
        </div>
        <Link
          href="/marketplace"
          className="text-[12px] text-[#fd5000] font-medium hover:underline flex items-center gap-0.5 group/link"
        >
          View all
          <ChevronRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>

      {/* List */}
      <div className="flex flex-col gap-1">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
              <ShoppingBag className="w-5 h-5 text-text-muted" />
            </div>
            <p className="text-[12px] font-semibold text-text-primary mb-1">No products yet</p>
            <p className="text-[11px] text-text-muted text-center mb-3">
              Browse the marketplace to find products to promote
            </p>
            <Link
              href="/marketplace"
              className="text-[11px] font-semibold text-[#fd5000] hover:underline"
            >
              Explore marketplace →
            </Link>
          </div>
        ) : (
          products.map((p) => {
            const soldCount = getSoldCount(p.sold);
            const isHot = soldCount >= 50;
            const hasCommission = !p.commission.toLowerCase().includes("no commission");
            const productHref = `/marketplace/${p.slug ?? p.id}`;

            return (
              <Link
                href={productHref}
                key={p.id}
                className="flex gap-3 items-center cursor-pointer group p-2 -mx-2 rounded-md hover:bg-surface-secondary transition-all duration-200"
              >
                {/* Product image */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-11 h-11 rounded-lg ring-2 ring-border group-hover:ring-[#fd5000]/30 transition-all duration-200 overflow-hidden flex items-center justify-center"
                    style={!p.imageUrl ? { background: p.imageColor } : undefined}
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Hide the broken image so the colored fallback shows through
                          const img = e.currentTarget;
                          img.style.display = "none";
                          if (img.parentElement) {
                            img.parentElement.style.background = p.imageColor;
                          }
                        }}
                      />
                    ) : (
                      <Tag className="w-4 h-4 text-white/70" />
                    )}
                  </div>
                  {isHot && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#fd5000] flex items-center justify-center shadow-sm shadow-[#fd5000]/40 ring-2 ring-surface">
                      <Flame size={9} className="text-white" />
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary truncate group-hover:text-[#fd5000] transition-colors duration-200">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-text-muted truncate">{p.category}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[12px] font-bold text-text-primary">{p.price}</p>
                    <span className="w-0.5 h-0.5 rounded-full bg-text-muted" />
                    <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                      <Flame size={9} className="text-[#fd5000]" /> {p.sold}
                    </span>
                  </div>
                </div>

                {/* Trailing meta */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {hasCommission ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e9f9ef] text-[#1a7d4a] dark:bg-[#0d2e1c] dark:text-[#6ee7a0] whitespace-nowrap">
                      {p.commission}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-secondary text-text-muted whitespace-nowrap">
                      No commission
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}