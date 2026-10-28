/**
 * T-5: communities and stores about trading, forex, crypto or investing carry
 * a visible risk notice. Detection uses the owner-chosen category plus the
 * public name/tagline, so it applies to every account the same way.
 */
const FINANCIAL_RISK =
  /\b(trad(?:e|er|ers|ing)|forex|fx|crypto(?:currency)?|bitcoin|invest(?:ing|ment|ments|or)?|stocks?|options|signals?|quant|finance|financial|prop firm|funded account)\b/i;

export function isFinancialRiskTopic(input: {
  category?: string | null;
  name?: string | null;
  tagline?: string | null;
}): boolean {
  return [input.category, input.name, input.tagline].some(
    (v) => typeof v === "string" && FINANCIAL_RISK.test(v),
  );
}

export const FINANCIAL_RISK_NOTICE =
  "Trading and investing carry a high risk of loss. Content here is shared by its creator for education and is not financial advice. Jimvio does not promise returns.";
