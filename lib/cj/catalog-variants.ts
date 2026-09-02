import type { CJVariant } from "@/lib/actions/cj_product";
import { normalizeCjVid } from "@/lib/cj/variant-vid";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/** CJ sometimes sends "[]" for unused property fields. */
function asMeaningfulString(value: unknown): string {
  const text = asString(value);
  if (!text || text === "[]" || text === "{}" || text === "null") return "";
  return text;
}

/** Option axes from the CJ catalog payload (English keys preferred). */
export function catalogOptionKeys(payload: Record<string, unknown> | null | undefined): string[] {
  if (!payload) return [];
  const preferred = payload.productKeyEnSet;
  const fallback = payload.productKeySet;
  const raw = Array.isArray(preferred) && preferred.length > 0 ? preferred : fallback;
  if (!Array.isArray(raw)) return [];
  return raw.filter((key): key is string => typeof key === "string" && key.trim().length > 0);
}

export function catalogVariantRecords(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown>[] {
  if (!payload || !Array.isArray(payload.variants)) return [];
  return payload.variants
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => Boolean(row));
}

export function catalogVariantStock(variant: Record<string, unknown>): number {
  const inventories = Array.isArray(variant.inventories) ? variant.inventories : [];
  const fromWarehouses = inventories.reduce((sum, entry) => {
    const row = asRecord(entry);
    if (!row) return sum;
    const qty = Number(
      row.totalInventory ?? row.factoryInventory ?? row.cjInventory ?? 0,
    );
    return sum + (Number.isFinite(qty) ? Math.max(0, qty) : 0);
  }, 0);
  if (fromWarehouses > 0) return fromWarehouses;
  const fallback = Number(variant.inventoryNum ?? 0);
  return Number.isFinite(fallback) ? Math.max(0, fallback) : 0;
}

export function toCjVariantFromCatalog(
  pid: string,
  productSku: string,
  variant: Record<string, unknown>,
): CJVariant | null {
  const vid = normalizeCjVid(variant.vid);
  if (!vid) return null;
  const variantSku = asMeaningfulString(variant.variantSku) || vid;
  return {
    vid,
    pid: asString(variant.pid) || pid,
    productSku,
    variantSku,
    variantName: asMeaningfulString(variant.variantName),
    variantNameEn: asMeaningfulString(variant.variantNameEn),
    variantImage: asString(variant.variantImage),
    variantProperty:
      asMeaningfulString(variant.variantProperty) ||
      asMeaningfulString(variant.variantKey) ||
      variantSku,
    variantSellPrice: asString(variant.variantSellPrice) || "0",
    variantWeight: asString(variant.variantWeight) || "0",
    variantLength: typeof variant.variantLength === "number" ? variant.variantLength : undefined,
    variantWidth: typeof variant.variantWidth === "number" ? variant.variantWidth : undefined,
    variantHeight: typeof variant.variantHeight === "number" ? variant.variantHeight : undefined,
    variantVolume: typeof variant.variantVolume === "number" ? variant.variantVolume : undefined,
    isSell: 1,
  };
}
