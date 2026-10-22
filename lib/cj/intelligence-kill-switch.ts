/**
 * Fail-closed kill switch for CJ product intelligence processing.
 * Existing cj_raw_products / cj_product_intelligence rows and published
 * marketplace products are preserved. Processing resumes only when this
 * flag is explicitly set to "true".
 */
export function isCjProductIntelligenceProcessingEnabled(): boolean {
  return process.env.CJ_PRODUCT_INTELLIGENCE_ENABLED === "true";
}

export function cjIntelligenceDisabledPayload<T extends Record<string, unknown>>(extra?: T) {
  return {
    ok: true,
    disabled: true,
    reason: "cj_product_intelligence_kill_switch",
    ...(extra ?? {}),
  };
}
