import { formatCurrency } from "@/lib/utils";

export type InvoiceOrder = {
  id: string;
  order_number?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  shipping_amount?: number | null;
  tax_amount?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;
  payment_status?: string | null;
  payment_provider?: string | null;
  shipping_address?: unknown;
  billing_address?: unknown;
  order_items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    variant_name?: string | null;
  }>;
  profiles?:
    | { full_name?: string | null; email?: string | null }
    | Array<{ full_name?: string | null; email?: string | null }>
    | null;
};

export type InvoiceLineItem = {
  name: string;
  variant?: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type InvoiceTotalLine = {
  label: string;
  value: string;
  accent?: boolean;
  grand?: boolean;
};

export type InvoiceData = {
  ref: string;
  issuedDate: string;
  paidDate: string | null;
  currency: string;
  paymentStatus: string;
  paymentProvider: string | null;
  buyerName: string;
  buyerEmail: string;
  addressLine: string;
  items: InvoiceLineItem[];
  totals: InvoiceTotalLine[];
};

function formatInvoiceDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function buildInvoiceData(order: InvoiceOrder): InvoiceData {
  const currency = (order.currency || "USD").toUpperCase();
  const ref = String(order.order_number || order.id).slice(0, 16).toUpperCase();
  const addr = ((order.shipping_address ?? order.billing_address ?? {}) as Record<string, string>);
  const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
  const buyerName =
    [addr.firstName ?? addr.first_name, addr.lastName ?? addr.last_name]
      .filter(Boolean)
      .join(" ") ||
    profile?.full_name ||
    "Customer";
  const buyerEmail = addr.email || profile?.email || "";
  const addressLine = [
    addr.address1,
    addr.address2,
    addr.city,
    addr.state ?? addr.province,
    addr.country,
    addr.postalCode ?? addr.postal_code ?? addr.zip,
  ]
    .filter(Boolean)
    .join(", ");

  const rawItems = order.order_items ?? [];
  const subtotal =
    Number(order.subtotal) > 0
      ? Number(order.subtotal)
      : rawItems.reduce((s, i) => s + Number(i.total_price || 0), 0);

  const items: InvoiceLineItem[] = rawItems.map((item) => ({
    name: item.product_name,
    variant: item.variant_name,
    quantity: item.quantity,
    unitPrice: formatCurrency(Number(item.unit_price), currency),
    totalPrice: formatCurrency(Number(item.total_price), currency),
  }));

  const totals: InvoiceTotalLine[] = [{ label: "Subtotal", value: formatCurrency(subtotal, currency) }];
  if (Number(order.shipping_amount) > 0) {
    totals.push({
      label: "Shipping",
      value: formatCurrency(Number(order.shipping_amount), currency),
    });
  }
  if (Number(order.discount_amount) > 0) {
    totals.push({
      label: "Discount",
      value: `−${formatCurrency(Number(order.discount_amount), currency)}`,
      accent: true,
    });
  }
  if (Number(order.tax_amount) > 0) {
    totals.push({ label: "Tax", value: formatCurrency(Number(order.tax_amount), currency) });
  }
  totals.push({
    label: "Total",
    value: formatCurrency(Number(order.total_amount), currency),
    grand: true,
  });

  return {
    ref,
    issuedDate: formatInvoiceDate(order.created_at),
    paidDate: order.paid_at ? formatInvoiceDate(order.paid_at) : null,
    currency,
    paymentStatus: order.payment_status ?? "pending",
    paymentProvider: order.payment_provider ?? null,
    buyerName,
    buyerEmail,
    addressLine,
    items,
    totals,
  };
}
