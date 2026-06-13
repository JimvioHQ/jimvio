/** Normalize CJ variant IDs to a stable string for DB lookups and upserts. */
export function normalizeCjVid(vid: unknown): string | null {
    if (vid === null || vid === undefined) return null;
    const normalized = String(vid).trim();
    return normalized.length > 0 ? normalized : null;
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
