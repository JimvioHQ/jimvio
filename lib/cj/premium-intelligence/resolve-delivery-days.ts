/**
 * Resolve delivery days from CJ freight API when product detail omits deliveryCycle.
 * Read-only CJ API call — does not modify import/publish pipelines.
 */

import { getCJToken } from "@/lib/cj/client";
import {
  isCjQuotaCircuitOpenAsync,
  markCjQuotaExhausted,
} from "@/lib/cj/quota-circuit";
import { isCjApiQuotaError } from "@/lib/cj/customer-errors-shared";

const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

const PROBE_COUNTRIES = ["US", "GB", "RW"];

function parseLogisticsDays(logisticsTime?: string | null): number | null {
  if (!logisticsTime) return null;
  const parts = logisticsTime.split("-").map((s) => parseInt(s.trim(), 10));
  const first = parts[0];
  return Number.isNaN(first) ? null : first;
}

function extractVariantInfo(
  detail: Record<string, unknown>
): { vid: string; weight: number } | null {
  const variants = detail.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const first = variants[0] as Record<string, unknown>;
  const vid = first.vid ?? first.variantId ?? first.id;
  if (typeof vid !== "string" || !vid) return null;
  const weight = Number(first.variantWeight ?? first.weight ?? 100);
  return { vid, weight: weight > 0 ? weight : 100 };
}

export async function resolveDeliveryDaysFromFreight(
  supabase: Parameters<typeof getCJToken>[0],
  pid: string,
  detail: Record<string, unknown>
): Promise<number | null> {
  const fromDetail = detail.deliveryCycle
    ? parseInt(String(detail.deliveryCycle), 10)
    : null;
  if (fromDetail !== null && !Number.isNaN(fromDetail)) return fromDetail;

  const variant = extractVariantInfo(detail);
  if (!variant) return null;

  let token: string;
  try {
    token = await getCJToken(supabase);
  } catch {
    return null;
  }

  if (await isCjQuotaCircuitOpenAsync()) return null;

  let bestDays: number | null = null;

  for (const countryCode of PROBE_COUNTRIES) {
    if (await isCjQuotaCircuitOpenAsync()) break;
    try {
      const res = await fetch(`${CJ_API_BASE}/logistic/freightCalculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CJ-Access-Token": token,
        },
        body: JSON.stringify({
          startCountryCode: "CN",
          endCountryCode: countryCode,
          products: [
            {
              vid: variant.vid,
              quantity: 1,
              weight: variant.weight,
            },
          ],
          weight: variant.weight,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      const data = (await res.json()) as {
        result?: boolean;
        message?: string;
        code?: string | number;
        data?: Array<{ logisticsTime?: string; logisticAging?: string }>;
      };

      if (isCjApiQuotaError(data.message) || isCjApiQuotaError(JSON.stringify(data))) {
        markCjQuotaExhausted(String(data.message ?? "CJ freight quota during delivery probe"));
        break;
      }

      if (!data.result || !data.data?.length) continue;

      for (const option of data.data) {
        const days =
          parseLogisticsDays(option.logisticAging) ??
          parseLogisticsDays(option.logisticsTime);
        if (days === null) continue;
        if (bestDays === null || days < bestDays) bestDays = days;
      }
    } catch {
      continue;
    }
  }

  return bestDays;
}
