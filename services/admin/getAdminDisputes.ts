import { getAdminDB } from "@/services/base";
import { formatAdminMoney } from "@/lib/admin/format-money";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";

export type AdminDisputeType = "all" | "cj" | "refund" | "cancelled";
export type AdminDisputeStatus = "open" | "resolved";

export type AdminDisputeRow = {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  amount_display: string;
  status: string;
  payment_status: string;
  cj_dispute_id: string | null;
  created_at: string;
  buyer_name: string;
  vendor_name: string | null;
  dispute_type: "cj" | "refund" | "cancelled";
  admin_status: AdminDisputeStatus;
  admin_note: string | null;
};

export type AdminDisputesResult = {
  rows: AdminDisputeRow[];
  total: number;
  openCount: number;
  cjCount: number;
  refundCount: number;
};

const PAGE_SIZE = 30;

function readDisputeMeta(metadata: unknown) {
  const meta = (metadata && typeof metadata === "object" ? metadata : {}) as Record<string, unknown>;
  const block = (meta.admin_dispute && typeof meta.admin_dispute === "object"
    ? meta.admin_dispute
    : {}) as Record<string, unknown>;
  return {
    admin_status: (block.status === "resolved" ? "resolved" : "open") as AdminDisputeStatus,
    admin_note: typeof block.note === "string" ? block.note : null,
  };
}

function classifyDispute(order: {
  cj_dispute_id: string | null;
  payment_status: string;
  status: string;
}): "cj" | "refund" | "cancelled" | null {
  if (order.cj_dispute_id) return "cj";
  if (order.payment_status === "refunded" || order.status === "refunded") return "refund";
  if (
    order.status === "cancelled" &&
    isOrderPaymentComplete(order.payment_status)
  ) {
    return "cancelled";
  }
  return null;
}

export async function getAdminDisputes(opts?: {
  type?: AdminDisputeType;
  status?: AdminDisputeStatus | "all";
  q?: string;
  page?: number;
}): Promise<AdminDisputesResult> {
  const admin = getAdminDB();
  const page = Math.max(1, opts?.page ?? 1);
  const typeFilter = opts?.type ?? "all";
  const statusFilter = opts?.status ?? "all";
  const q = (opts?.q ?? "").trim().toLowerCase();

  const { data: orders } = await admin
    .from("orders")
    .select(
      `
      id, order_number, total_amount, currency, status, payment_status,
      cj_dispute_id, created_at, metadata,
      profiles!orders_buyer_id_fkey(full_name, email),
      vendors(business_name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(500);

  let rows: AdminDisputeRow[] = (orders ?? [])
    .map((o: any) => {
      const disputeType = classifyDispute(o);
      if (!disputeType) return null;
      const meta = readDisputeMeta(o.metadata);
      const buyer = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
      const vendor = Array.isArray(o.vendors) ? o.vendors[0] : o.vendors;
      return {
        id: o.id,
        order_number: o.order_number,
        total_amount: Number(o.total_amount ?? 0),
        currency: o.currency ?? "RWF",
        amount_display: formatAdminMoney(o.total_amount, o.currency),
        status: o.status,
        payment_status: o.payment_status,
        cj_dispute_id: o.cj_dispute_id,
        created_at: o.created_at,
        buyer_name: buyer?.full_name ?? buyer?.email ?? "Buyer",
        vendor_name: vendor?.business_name ?? null,
        dispute_type: disputeType,
        admin_status: meta.admin_status,
        admin_note: meta.admin_note,
      } satisfies AdminDisputeRow;
    })
    .filter(Boolean) as AdminDisputeRow[];

  if (typeFilter !== "all") {
    rows = rows.filter((r) => r.dispute_type === typeFilter);
  }
  if (statusFilter !== "all") {
    rows = rows.filter((r) => r.admin_status === statusFilter);
  }
  if (q) {
    rows = rows.filter((r) => {
      const hay = [r.order_number, r.buyer_name, r.vendor_name, r.cj_dispute_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  const openCount = rows.filter((r) => r.admin_status === "open").length;
  const cjCount = rows.filter((r) => r.dispute_type === "cj").length;
  const refundCount = rows.filter((r) => r.dispute_type === "refund").length;
  const total = rows.length;
  const start = (page - 1) * PAGE_SIZE;
  rows = rows.slice(start, start + PAGE_SIZE);

  return { rows, total, openCount, cjCount, refundCount };
}
