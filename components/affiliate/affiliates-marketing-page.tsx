"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AffiliateCategories } from "./sections/AffiliateCategories";
import { AffiliateHowItWorks } from "./sections/AffiliateHowItWorks";
import { AffiliateProducts } from "./sections/AffiliateProducts";
import type { AffiliateSpotlightProduct } from "./sections/shared";
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
};

export function AffiliatesMarketingPage({
  category,
  search,
  replaceUrl = null,
  products,
  total = null,
  pickedProductIds = [],
  loadError = null,
}: AffiliatesMarketingPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState(search);
  const [listFilter, setListFilter] = useState<"all" | AffiliateDiscoveryCategoryId>("all");
  const requestedQuery = useRef(normalizeAffiliateSearch(search));
  const categoryRef = useRef(category);
  const navTicket = useRef(0);

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
        router.replace(affiliateDiscoveryHref(active, next), { scroll: false });
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [input, search, category, router]);

  const selectCategory = (id: AffiliateDiscoveryCategoryId) => {
    const nextSearch = normalizeAffiliateSearch(input);
    if (id === categoryRef.current && nextSearch === normalizeAffiliateSearch(search)) return;
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
      router.replace(affiliateDiscoveryHref(categoryRef.current, ""), { scroll: false });
    });
  };

  return (
    <div className="min-h-full bg-[#F7F8FA] pb-16 font-sans text-[#111827]">
      <AffiliateHowItWorks bare />
      <AffiliateCategories
        active={category}
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
    </div>
  );
}
