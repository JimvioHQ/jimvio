const JIMVIO_UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalize CJ variant IDs to a stable string for DB lookups and upserts. */
export function normalizeCjVid(vid: unknown): string | null {
    if (vid === null || vid === undefined) return null;
    const normalized = String(vid).trim();
    return normalized.length > 0 ? normalized : null;
}

/**
 * A usable CJ freight vid. Never treat a Jimvio variant UUID as a CJ vid —
 * those must be resolved from product_variants.cj_vid first.
 * CJ vids themselves may be UUID-shaped; this only rejects the fallback mistake.
 */
export function usableCjVid(vid: unknown, opts?: { rejectUuid?: boolean }): string | null {
    const normalized = normalizeCjVid(vid);
    if (!normalized) return null;
    if (opts?.rejectUuid && JIMVIO_UUID_RE.test(normalized)) return null;
    return normalized;
}

export function isJimvioUuid(value: unknown): value is string {
    return typeof value === "string" && JIMVIO_UUID_RE.test(value.trim());
}

export type CjVariantSourceMetadata = {
    cj_vid?: string;
    cj_pid?: string | null;
    cj_sku?: string;
    cj_property?: string;
    price_usd?: number;
    [key: string]: unknown;
};

/** Ensure every CJ variant row carries cj_vid in both the column and source_metadata. */
export function withCjVariantSourceMetadata(
    metadata: CjVariantSourceMetadata,
    cjVid: string,
    cjPid?: string | null
): CjVariantSourceMetadata {
    return {
        ...metadata,
        cj_vid: cjVid,
        ...(cjPid != null ? { cj_pid: cjPid } : {}),
    };
}
