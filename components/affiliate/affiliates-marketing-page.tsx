"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AffiliateHero } from "./sections/AffiliateHero";
import { AffiliateCategories } from "./sections/AffiliateCategories";
import { AffiliateHowItWorks } from "./sections/AffiliateHowItWorks";
import { AffiliateProducts } from "./sections/AffiliateProducts";
import { AffiliateBottomCta } from "./sections/AffiliateBottomCta";
import { AFFILIATE_BTN_PRIMARY, type AffiliateSpotlightProduct } from "./sections/shared";
import { cn } from "@/lib/utils";
import {
  affiliateDiscoveryHref,
  normalizeAffiliateSearch,
  type AffiliateDiscoveryCategoryId,
} from "@/lib/affiliate/discovery";

type AffiliatesMarketingPageProps = {
  category: AffiliateDiscoveryCategoryId;
  search: string;
  replaceUrl?: string | null;
  products: AffiliateSpotlightProduct[];
  total?: number | null;
  pickedProductIds?: string[];
  loadError?: string | null;
  heroRate: number;
  primaryCtaHref: string;
  /** True when the URL names a category. The default featured view is not preselected. */
  categoryChosen?: boolean;
};

export function AffiliatesMarketingPage({
  category,
  search,
  replaceUrl = null,
  products,
  total = null,
  pickedProductIds = [],
  loadError = null,
  heroRate,
  primaryCtaHref,
  categoryChosen = false,
}: AffiliatesMarketingPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickedId, setPickedId] = useState<AffiliateDiscoveryCategoryId | null>(
    categoryChosen ? category : null,
  );
  const [seenChosen, setSeenChosen] = useState(categoryChosen);
  const [input, setInput] = useState(search);
  const [listFilter, setListFilter] = useState<"all" | AffiliateDiscoveryCategoryId>("all");
  const requestedQuery = useRef(normalizeAffiliateSearch(search));
  const categoryRef = useRef(category);
  const navTicket = useRef(0);
  if (categoryChosen !== seenChosen) {
    setSeenChosen(categoryChosen);
    setPickedId(categoryChosen ? category : null);
  }

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  useEffect(() => {
    if (!replaceUrl) return;
    navTicket.current += 1;
    requestedQuery.current = normalizeAffiliateSearch(search);
    router.replace(replaceUrl, { scroll: false });
  }, [replaceUrl, router, search]);

  useEffect(() => {
    const urlQuery = normalizeAffiliateSearch(search);
    if (urlQuery !== requestedQuery.current && urlQuery !== normalizeAffiliateSearch(input)) {
      setInput(search);
      requestedQuery.current = urlQuery;
    }
  }, [search, input]);

  useEffect(() => {
    const ticket = navTicket.current;
    const handle = window.setTimeout(() => {
      if (navTicket.current !== ticket) return;
      const next = normalizeAffiliateSearch(input);
      const active = categoryRef.current;
      if (next === normalizeAffiliateSearch(search) && active === category) return;
      requestedQuery.current = next;
      startTransition(() => {
        router.replace(
          affiliateDiscoveryHref(active, next, { includeCategory: pickedId !== null }),
          { scroll: false },
        );
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [input, search, category, router, pickedId]);

  const selectCategory = (id: AffiliateDiscoveryCategoryId) => {
    const nextSearch = normalizeAffiliateSearch(input);
    const sameView =
      id === categoryRef.current && nextSearch === normalizeAffiliateSearch(search);
    if (sameView && pickedId === id) return;
    setPickedId(id);
    categoryRef.current = id;
    navTicket.current += 1;
    requestedQuery.current = nextSearch;
    startTransition(() => {
      router.replace(affiliateDiscoveryHref(id, nextSearch), { scroll: false });
    });
  };

  const clearSearch = () => {
    setInput("");
    requestedQuery.current = "";
    navTicket.current += 1;
    startTransition(() => {
      router.replace(
        affiliateDiscoveryHref(categoryRef.current, "", { includeCategory: pickedId !== null }),
        { scroll: false },
      );
    });
  };

  return (
    <div className="relative min-h-full bg-[#F7F8FA] pb-16 font-sans text-[#111827]">
      <AffiliateHero heroRate={heroRate} primaryCtaHref={primaryCtaHref} />
      <AffiliateHowItWorks bare />
      <AffiliateCategories
        active={pickedId}
        query={input}
        onQueryChange={setInput}
        onSelect={selectCategory}
        listFilter={listFilter}
        onListFilter={setListFilter}
      />
      <AffiliateProducts
        key={`${category}|${search}|${total ?? ""}|${products.map((product) => product.id).join(",")}|${pickedProductIds.join(",")}|${loadError ?? ""}`}
        products={products}
        total={total}
        category={category}
        search={search}
        pickedProductIds={pickedProductIds}
        loadError={loadError}
        pending={isPending}
        onClearSearch={clearSearch}
        onSelectCategory={selectCategory}
        onRetry={() => router.refresh()}
      />
      <AffiliateBottomCta primaryCtaHref={primaryCtaHref} />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#FFE4D6]/80 bg-white/92 p-3 backdrop-blur-md sm:hidden">
        <Link
          href={primaryCtaHref}
          className={cn(AFFILIATE_BTN_PRIMARY, "h-11 w-full px-4 text-[13.5px]")}
        >
          Start Promoting Now
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
