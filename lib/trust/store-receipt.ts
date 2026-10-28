/**
 * N-3 Trust Receipt: facts about a store taken only from Jimvio's own
 * records (verification, account age, live products, paid / delivered
 * orders, disputes, verified-buyer reviews). Nothing here is typed by the
 * seller, so buyers can rely on it.
 */
export type StoreTrustFacts = {
  verified: boolean;
  since: string | null;
  liveProducts: number;
  paidOrders: number;
  deliveredOrders: number;
  disputes: number;
  reviewCount: number;
  avgRating: number | null;
};

export type TrustReceiptLine = {
  id: "identity" | "since" | "products" | "orders" | "disputes" | "reviews";
  label: string;
  value: string;
  tone: "good" | "neutral";
};

function monthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function buildTrustReceiptLines(f: StoreTrustFacts): TrustReceiptLine[] {
  const lines: TrustReceiptLine[] = [
    {
      id: "identity",
      label: "Identity",
      value: f.verified ? "Verified by Jimvio" : "Not verified yet",
      tone: f.verified ? "good" : "neutral",
    },
    { id: "since", label: "On Jimvio since", value: f.since ? monthYear(f.since) : "—", tone: "neutral" },
    { id: "products", label: "Live products", value: f.liveProducts.toLocaleString("en-US"), tone: "neutral" },
    {
      id: "orders",
      label: "Paid orders",
      value:
        f.paidOrders === 0
          ? "None yet"
          : `${f.paidOrders.toLocaleString("en-US")} · ${f.deliveredOrders.toLocaleString("en-US")} delivered`,
      tone: f.paidOrders > 0 ? "good" : "neutral",
    },
    {
      id: "disputes",
      label: "Disputes",
      value: f.disputes === 0 ? "None" : f.disputes.toLocaleString("en-US"),
      tone: f.disputes === 0 ? "good" : "neutral",
    },
    {
      id: "reviews",
      label: "Verified-buyer reviews",
      value:
        f.reviewCount === 0 || f.avgRating == null
          ? "None yet"
          : `${f.avgRating.toFixed(1)} / 5 · ${f.reviewCount.toLocaleString("en-US")}`,
      tone: f.reviewCount > 0 ? "good" : "neutral",
    },
  ];
  return lines;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

const DELIVERED = ["delivered", "completed"];

export async function loadStoreTrustFacts(
  db: Db,
  vendor: { id: string; created_at?: string | null; verification_status?: string | null },
  liveProducts: number,
): Promise<StoreTrustFacts> {
  const count = async (q: PromiseLike<{ count: number | null }>) => {
    try {
      return (await q).count ?? 0;
    } catch {
      return 0;
    }
  };
  const [paidOrders, deliveredOrders, disputes, reviewsRes] = await Promise.all([
    count(db.from("orders").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id).eq("payment_status", "paid")),
    count(
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendor.id)
        .eq("payment_status", "paid")
        .in("status", DELIVERED),
    ),
    count(db.from("ds_disputes").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id)),
    (async () => {
      try {
        const { data } = await db
          .from("reviews")
          .select("rating")
          .eq("vendor_id", vendor.id)
          .eq("is_verified_purchase", true)
          .limit(5000);
        return (data ?? []) as { rating: number | null }[];
      } catch {
        return [] as { rating: number | null }[];
      }
    })(),
  ]);
  const ratings = reviewsRes.map((r) => Number(r.rating)).filter((n) => Number.isFinite(n) && n > 0);
  return {
    verified: vendor.verification_status === "verified",
    since: vendor.created_at ?? null,
    liveProducts,
    paidOrders,
    deliveredOrders,
    disputes,
    reviewCount: ratings.length,
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
  };
}
