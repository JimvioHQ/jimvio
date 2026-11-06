"use client";

import { useEffect, useMemo, useState } from "react";
import { isFulfilledSource } from "@/lib/marketplace/public-product";
import { detectBrowserCountry, countryDisplayName } from "@/lib/geo/buyer-country";
import {
  filterShippingOptions,
  storefrontMetaFromProduct,
  uniqueShipToCountryLabels,
  type RegionalShippingOption,
  type StorefrontShippingMeta,
} from "@/lib/shipping/regional-shipping";
import { resolveStorefrontShippingDisplay } from "@/lib/cj/shipping-display";

type UseRegionalShippingParams = {
  productId: string;
  productSource?: string | null;
  isFreeShippingFlag?: boolean | null;
  sourceMetadata?: Record<string, unknown> | null;
  allShippingOptions: RegionalShippingOption[];
  initialCountry?: string;
  selectedVariantId?: string | null;
};

type UseRegionalShippingResult = {
  buyerCountry: string;
  buyerCountryLabel: string;
  shippingOptions: RegionalShippingOption[];
  shippingDisplay: ReturnType<typeof resolveStorefrontShippingDisplay>;
  shipsToLabels: string[];
  storefrontMeta: StorefrontShippingMeta;
  isFreeShipping: boolean;
  loading: boolean;
};

export function useRegionalShipping({
  productId,
  productSource,
  isFreeShippingFlag,
  sourceMetadata,
  allShippingOptions,
  initialCountry = "RW",
  selectedVariantId,
}: UseRegionalShippingParams): UseRegionalShippingResult {
  const [buyerCountry, setBuyerCountry] = useState(initialCountry);
  const [liveOptions, setLiveOptions] = useState<RegionalShippingOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const detected = detectBrowserCountry(initialCountry);
    setBuyerCountry(detected);
  }, [initialCountry]);

  const cachedRegional = useMemo(
    () => filterShippingOptions(allShippingOptions, buyerCountry),
    [allShippingOptions, buyerCountry],
  );

  useEffect(() => {
    if (cachedRegional.length > 0) {
      setLiveOptions([]);
      return;
    }

    if (!isFulfilledSource(productSource)) {
      setLiveOptions([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ country: buyerCountry });
        if (selectedVariantId) params.set("variantId", selectedVariantId);

        const res = await fetch(`/api/products/${productId}/shipping?${params}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.options)) {
          setLiveOptions(json.options as RegionalShippingOption[]);
        }
      } catch {
        if (!cancelled) setLiveOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    productId,
    productSource,
    buyerCountry,
    selectedVariantId,
    cachedRegional.length,
  ]);

  const shippingOptions = cachedRegional.length > 0 ? cachedRegional : liveOptions;

  const storefrontMeta = useMemo(
    () =>
      storefrontMetaFromProduct({
        is_free_shipping: isFreeShippingFlag,
        source_metadata: sourceMetadata ?? null,
      }),
    [isFreeShippingFlag, sourceMetadata],
  );

  const isFreeShipping =
    Boolean(isFreeShippingFlag ?? storefrontMeta.isFreeShipping) ||
    shippingOptions.some((o) => o.is_free_shipping);

  const shippingDisplay = useMemo(
    () =>
      resolveStorefrontShippingDisplay(
        shippingOptions,
        storefrontMeta,
        isFreeShipping,
        allShippingOptions,
      ),
    [shippingOptions, storefrontMeta, isFreeShipping, allShippingOptions],
  );

  const shipsToLabels = useMemo(() => {
    const pool = allShippingOptions.length > 0 ? allShippingOptions : shippingOptions;
    const labels = uniqueShipToCountryLabels(pool);
    if (labels.length > 0) return labels;
    if (buyerCountry) return [countryDisplayName(buyerCountry)];
    return [];
  }, [allShippingOptions, shippingOptions, buyerCountry]);

  return {
    buyerCountry,
    buyerCountryLabel: countryDisplayName(buyerCountry),
    shippingOptions,
    shippingDisplay,
    shipsToLabels,
    storefrontMeta,
    isFreeShipping,
    loading,
  };
}
