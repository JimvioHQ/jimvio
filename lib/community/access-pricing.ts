/**
 * Community Access pricing: what the owner sets and what the join page sells.
 *
 * Free, or Paid with either a one-time price (stored as lifetime_price) or a
 * subscription billed weekly, monthly, quarterly or yearly. A compare-at price
 * shows the regular price; an affiliate commission rewards members who refer
 * new paying members.
 */
export type BillingType = "one_time" | "subscription";
export type BillingInterval = "weekly" | "monthly" | "quarterly" | "yearly";
export type AccessPlanKey = BillingInterval | "lifetime";

export const BILLING_INTERVALS: readonly { id: BillingInterval; label: string; per: string }[] = [
  { id: "weekly", label: "Weekly", per: "week" },
  { id: "monthly", label: "Monthly", per: "month" },
  { id: "quarterly", label: "Quarterly", per: "quarter" },
  { id: "yearly", label: "Yearly", per: "year" },
];

export type CommunityPriceRow = {
  is_free?: boolean | null;
  weekly_price?: number | string | null;
  monthly_price?: number | string | null;
  quarterly_price?: number | string | null;
  yearly_price?: number | string | null;
  lifetime_price?: number | string | null;
  compare_at_price?: number | string | null;
  billing_type?: string | null;
  billing_interval?: string | null;
  affiliate_commission_rate?: number | string | null;
};

export type AccessPricingForm = {
  paid: boolean;
  price: number | null;
  billingType: BillingType;
  interval: BillingInterval;
  compareAtPrice: number | null;
  affiliateCommission: number | null;
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const priceFor = (row: CommunityPriceRow, key: AccessPlanKey) => num(row[`${key}_price` as keyof CommunityPriceRow]);

/** Read the stored row into the owner's form. */
export function accessPricingFromRow(row: CommunityPriceRow): AccessPricingForm {
  const billingType: BillingType =
    row.billing_type === "one_time" || row.billing_type === "subscription"
      ? row.billing_type
      : (priceFor(row, "lifetime") ?? 0) > 0 && !(priceFor(row, "monthly") ?? 0) && !(priceFor(row, "yearly") ?? 0)
        ? "one_time"
        : "subscription";
  const interval = (BILLING_INTERVALS.find((i) => i.id === row.billing_interval)?.id ??
    BILLING_INTERVALS.find((i) => (priceFor(row, i.id) ?? 0) > 0)?.id ??
    "monthly") as BillingInterval;
  const price = billingType === "one_time" ? priceFor(row, "lifetime") : priceFor(row, interval);
  return {
    paid: row.is_free === false,
    price,
    billingType,
    interval,
    compareAtPrice: num(row.compare_at_price),
    affiliateCommission: num(row.affiliate_commission_rate),
  };
}

export type AccessPricingError = { field: keyof AccessPricingForm; message: string };

export function validateAccessPricing(form: AccessPricingForm): AccessPricingError | null {
  if (!form.paid) return null;
  if (!form.price || form.price < 1) return { field: "price", message: "Enter a price of at least $1" };
  if (form.price > 100000) return { field: "price", message: "Price is too high" };
  if (form.compareAtPrice != null && form.compareAtPrice > 0 && form.compareAtPrice <= form.price) {
    return { field: "compareAtPrice", message: "Compare-at price must be higher than the price" };
  }
  if (form.affiliateCommission != null && (form.affiliateCommission < 0 || form.affiliateCommission > 90)) {
    return { field: "affiliateCommission", message: "Commission must be between 0% and 90%" };
  }
  return null;
}

/** The database patch for the owner's choice. Only the chosen plan keeps a price. */
export function accessPricingToPatch(form: AccessPricingForm): Required<Omit<CommunityPriceRow, never>> {
  const paid = form.paid && (form.price ?? 0) > 0;
  const round = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100);
  const price = paid ? round(form.price) : null;
  const sub = paid && form.billingType === "subscription";
  return {
    is_free: !paid,
    weekly_price: sub && form.interval === "weekly" ? price : null,
    monthly_price: sub && form.interval === "monthly" ? price : null,
    quarterly_price: sub && form.interval === "quarterly" ? price : null,
    yearly_price: sub && form.interval === "yearly" ? price : null,
    lifetime_price: paid && form.billingType === "one_time" ? price : null,
    compare_at_price: paid && form.compareAtPrice && form.compareAtPrice > (price ?? 0) ? round(form.compareAtPrice) : null,
    billing_type: paid ? form.billingType : null,
    billing_interval: sub ? form.interval : null,
    affiliate_commission_rate: paid && form.affiliateCommission ? round(form.affiliateCommission) : null,
  };
}

export type AccessPlan = { key: AccessPlanKey; label: string; price: number; desc: string };

/** Plans a buyer can choose on the join page, in display order. */
export function accessPlans(row: CommunityPriceRow): AccessPlan[] {
  const plans: AccessPlan[] = [];
  const desc: Record<AccessPlanKey, string> = {
    weekly: "Billed every week",
    monthly: "Billed every month — cancel anytime",
    quarterly: "Billed every 3 months",
    yearly: "Billed once a year",
    lifetime: "Pay once, access forever",
  };
  for (const i of BILLING_INTERVALS) {
    const p = priceFor(row, i.id);
    if (p && p > 0) plans.push({ key: i.id, label: i.label, price: p, desc: desc[i.id] });
  }
  const life = priceFor(row, "lifetime");
  if (life && life > 0) plans.push({ key: "lifetime", label: "One-time", price: life, desc: desc.lifetime });
  return plans;
}

export function isAccessPlanKey(v: unknown): v is AccessPlanKey {
  return v === "weekly" || v === "monthly" || v === "quarterly" || v === "yearly" || v === "lifetime";
}

/** When a paid membership ends; null = never (one-time). */
export function accessPlanExpiry(plan: string, from = new Date()): string | null {
  const d = new Date(from);
  if (plan === "weekly") d.setDate(d.getDate() + 7);
  else if (plan === "monthly") d.setMonth(d.getMonth() + 1);
  else if (plan === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (plan === "yearly") d.setFullYear(d.getFullYear() + 1);
  else return null;
  return d.toISOString();
}
