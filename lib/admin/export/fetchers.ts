import { getAdminDB } from "@/services/base";
import { getAdminProducts } from "@/services/products";
import { getAdminVendors } from "@/services/vendors";
import { getAdminUsers } from "@/services/admin/getAdminUsers";
import { getAdminDisputes } from "@/services/admin/getAdminDisputes";
import { getAdminMessages } from "@/services/admin/getAdminMessages";
import { getAdminReports } from "@/services/admin/getAdminReports";
import { ADMIN_RANGES, resolveAdminRange } from "@/lib/admin/ranges";
import type { ExportDocument, ExportResource } from "@/lib/admin/export/types";

const EXPORT_LIMIT = 5000;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

function fmtAmount(amount: unknown, currency?: string | null) {
  const n = Number(amount ?? 0);
  const cur = (currency ?? "RWF").toUpperCase();
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${cur}`;
}

function cell(value: unknown) {
  if (value == null) return "";
  return String(value);
}

function ordersRangeStart(range: string) {
  const ranges: Record<string, () => Date | null> = {
    today: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    },
    "7d": () => new Date(Date.now() - 7 * 86400000),
    "30d": () => new Date(Date.now() - 30 * 86400000),
    mtd: () => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1);
    },
    qtd: () => {
      const d = new Date();
      return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
    },
    ytd: () => new Date(new Date().getFullYear(), 0, 1),
    all: () => null,
  };
  const fn = ranges[range];
  return fn ? fn() : ranges.mtd();
}

function exportRangeLabel(range: string) {
  const key = resolveAdminRange(range);
  return ADMIN_RANGES[key].label;
}

function paymentsRangeStart(range: string) {
  const ranges: Record<string, () => Date> = {
    today: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    },
    "7d": () => new Date(Date.now() - 7 * 86400000),
    "30d": () => new Date(Date.now() - 30 * 86400000),
    mtd: () => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1);
    },
    qtd: () => {
      const d = new Date();
      const q = Math.floor(d.getMonth() / 3);
      return new Date(d.getFullYear(), q * 3, 1);
    },
    ytd: () => new Date(new Date().getFullYear(), 0, 1),
  };
  return (ranges[range] ?? ranges.mtd)();
}

async function fetchOrdersExport(search: URLSearchParams): Promise<ExportDocument> {
  const admin = getAdminDB();
  const range = search.get("range") ?? "mtd";
  const rangeStart = ordersRangeStart(range);
  const payment = search.get("payment") ?? "all";
  const status = search.get("status") ?? "all";
  const source = search.get("source") ?? "all";
  const q = (search.get("q") ?? "").trim();

  let query = admin
    .from("orders")
    .select(
      `order_number, total_amount, currency, status, payment_status, integration_source, created_at, paid_at,
       profiles!orders_buyer_id_fkey(full_name, email),
       vendors(business_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(EXPORT_LIMIT);

  if (rangeStart) query = query.gte("created_at", rangeStart.toISOString());
  if (payment !== "all") query = query.eq("payment_status", payment as never);
  if (status !== "all") query = query.eq("status", status as never);
  if (source !== "all") query = query.eq("integration_source", source);
  if (q) query = query.or(`order_number.ilike.%${q}%,id.eq.${q}`);

  const { data } = await query;
  const rows = (data ?? []) as any[];

  return {
    title: "Orders export",
    subtitle: `Range: ${range} · ${rows.length} rows`,
    filename: `jimvio-orders-${range}`,
    sheets: [
      {
        name: "Orders",
        columns: [
          "Order #",
          "Buyer",
          "Email",
          "Vendor",
          "Total",
          "Currency",
          "Payment",
          "Fulfillment",
          "Source",
          "Created",
          "Paid at",
        ],
        rows: rows.map((o) => {
          const buyer = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
          const vendor = Array.isArray(o.vendors) ? o.vendors[0] : o.vendors;
          return [
            cell(o.order_number),
            cell(buyer?.full_name),
            cell(buyer?.email),
            cell(vendor?.business_name),
            cell(o.total_amount),
            cell(o.currency),
            cell(o.payment_status),
            cell(o.status),
            cell(o.integration_source),
            fmtDate(o.created_at),
            fmtDate(o.paid_at),
          ];
        }),
      },
    ],
  };
}

async function fetchProductsExport(search: URLSearchParams): Promise<ExportDocument> {
  const { products } = await getAdminProducts({
    q: search.get("q") ?? undefined,
    status: (search.get("status") as any) ?? "all",
    source: search.get("source") ?? "all",
    featured: search.get("featured") ?? undefined,
    sort: search.get("sort") ?? "created_at",
    order: (search.get("order") as "asc" | "desc") ?? "desc",
    page: 1,
    pageSize: EXPORT_LIMIT,
  });

  return {
    title: "Products export",
    subtitle: `${products.length} products`,
    filename: "jimvio-products",
    sheets: [
      {
        name: "Products",
        columns: [
          "Name",
          "Slug",
          "Vendor",
          "Status",
          "Type",
          "Price",
          "Currency",
          "Source",
          "Featured",
          "Sales",
          "Views",
          "Stock",
          "Created",
        ],
        rows: products.map((p: any) => {
          const vendor = Array.isArray(p.vendors) ? p.vendors[0] : p.vendors;
          return [
            cell(p.name),
            cell(p.slug),
            cell(vendor?.business_name),
            cell(p.status),
            cell(p.product_type),
            cell(p.price),
            cell(p.currency),
            cell(p.source),
            p.is_featured ? "Yes" : "No",
            cell(p.sale_count),
            cell(p.view_count),
            cell(p.inventory_quantity),
            fmtDate(p.created_at),
          ];
        }),
      },
    ],
  };
}

async function fetchVendorsExport(search: URLSearchParams): Promise<ExportDocument> {
  const { vendors } = await getAdminVendors({
    query: search.get("q") ?? undefined,
    status: (search.get("status") as any) ?? "all",
    sort: (search.get("sort") as any) ?? "created_at",
    page: 1,
    pageSize: EXPORT_LIMIT,
  });

  return {
    title: "Vendors export",
    subtitle: `${vendors.length} vendors`,
    filename: "jimvio-vendors",
    sheets: [
      {
        name: "Vendors",
        columns: [
          "Store",
          "Owner",
          "Email",
          "Country",
          "Status",
          "Products",
          "Revenue",
          "Sales",
          "Rating",
          "Followers",
          "Joined",
        ],
        rows: vendors.map((v: any) => [
          cell(v.business_name),
          cell(v.owner_name),
          cell(v.owner_email),
          cell(v.business_country),
          cell(v.verification_status),
          cell(v.products_count),
          cell(v.total_revenue),
          cell(v.total_sales),
          cell(v.average_rating),
          cell(v.followers_count),
          fmtDate(v.created_at),
        ]),
      },
    ],
  };
}

async function fetchPaymentsExport(search: URLSearchParams): Promise<ExportDocument> {
  const admin = getAdminDB();
  const range = search.get("range") ?? "mtd";
  const tab = search.get("tab") ?? "transactions";
  const startIso = paymentsRangeStart(range).toISOString();

  if (tab === "payouts") {
    const { data } = await admin
      .from("payouts")
      .select(
        `id, type, amount, fee, net_amount, currency, status, payout_method, processed_at, created_at,
         profiles(full_name, email)`,
      )
      .gte("created_at", startIso)
      .order("created_at", { ascending: false })
      .limit(EXPORT_LIMIT);

    const rows = (data ?? []) as any[];
    return {
      title: "Payouts export",
      subtitle: exportRangeLabel(range),
      filename: `jimvio-payouts-${range}`,
      sheets: [
        {
          name: "Payouts",
          columns: ["ID", "User", "Email", "Type", "Amount", "Fee", "Net", "Currency", "Status", "Method", "Created", "Processed"],
          rows: rows.map((r) => {
            const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            return [
              cell(r.id),
              cell(profile?.full_name),
              cell(profile?.email),
              cell(r.type),
              cell(r.amount),
              cell(r.fee),
              cell(r.net_amount),
              cell(r.currency),
              cell(r.status),
              cell(r.payout_method),
              fmtDate(r.created_at),
              fmtDate(r.processed_at),
            ];
          }),
        },
      ],
    };
  }

  if (tab === "orders") {
    const { data } = await admin
      .from("orders")
      .select(
        `order_number, total_amount, currency, status, payment_status, integration_source, created_at,
         profiles!orders_buyer_id_fkey(full_name, email),
         vendors(business_name)`,
      )
      .gte("created_at", startIso)
      .order("created_at", { ascending: false })
      .limit(EXPORT_LIMIT);

    const rows = (data ?? []) as any[];
    return {
      title: "Payment orders export",
      subtitle: exportRangeLabel(range),
      filename: `jimvio-payment-orders-${range}`,
      sheets: [
        {
          name: "Orders",
          columns: ["Order #", "Buyer", "Vendor", "Total", "Currency", "Payment", "Status", "Source", "Created"],
          rows: rows.map((o) => {
            const buyer = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
            const vendor = Array.isArray(o.vendors) ? o.vendors[0] : o.vendors;
            return [
              cell(o.order_number),
              cell(buyer?.full_name ?? buyer?.email),
              cell(vendor?.business_name),
              cell(o.total_amount),
              cell(o.currency),
              cell(o.payment_status),
              cell(o.status),
              cell(o.integration_source),
              fmtDate(o.created_at),
            ];
          }),
        },
      ],
    };
  }

  const { data } = await admin
    .from("transactions")
    .select(
      `id, amount, currency, amount_usd, status, provider, provider_transaction_id, type, description, created_at, order_id,
       profiles!transactions_user_id_fkey(full_name, email),
       orders(order_number)`,
    )
    .gte("created_at", startIso)
    .order("created_at", { ascending: false })
    .limit(EXPORT_LIMIT);

  const rows = (data ?? []) as any[];
  return {
    title: "Transactions export",
    subtitle: exportRangeLabel(range),
    filename: `jimvio-transactions-${range}`,
    sheets: [
      {
        name: "Transactions",
        columns: ["Order #", "User", "Provider", "Type", "Amount", "Status", "Reference", "Created"],
        rows: rows.map((t) => {
          const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
          const order = Array.isArray(t.orders) ? t.orders[0] : t.orders;
          const ref = t.provider_transaction_id ? String(t.provider_transaction_id) : "";
          return [
            cell(order?.order_number),
            cell(profile?.full_name ?? profile?.email),
            cell(t.provider),
            cell(t.type),
            fmtAmount(t.amount, t.currency),
            cell(t.status),
            ref ? cell(ref) : "—",
            fmtDate(t.created_at),
          ];
        }),
      },
    ],
  };
}

async function fetchUsersExport(search: URLSearchParams): Promise<ExportDocument> {
  const { users } = await getAdminUsers(
    search.get("q") ?? undefined,
    search.get("role") ?? undefined,
    search.get("status") ?? undefined,
    EXPORT_LIMIT,
    0,
  );

  return {
    title: "Users export",
    subtitle: `${users.length} users`,
    filename: "jimvio-users",
    sheets: [
      {
        name: "Users",
        columns: [
          "Name",
          "Email",
          "Roles",
          "Country",
          "Verified",
          "Active",
          "2FA",
          "Vendor",
          "Affiliate code",
          "Joined",
        ],
        rows: users.map((u) => [
          cell(u.full_name),
          cell(u.email),
          u.roles.join(", "),
          cell(u.country),
          u.is_verified ? "Yes" : "No",
          u.is_active ? "Yes" : "No",
          u.two_factor_enabled ? "Yes" : "No",
          cell(u.vendor_name),
          cell(u.affiliate_code),
          fmtDate(u.created_at),
        ]),
      },
    ],
  };
}

async function fetchDisputesExport(search: URLSearchParams): Promise<ExportDocument> {
  const { rows, total } = await getAdminDisputes({
    type: (search.get("type") as any) ?? "all",
    status: (search.get("status") as any) ?? "all",
    q: search.get("q") ?? undefined,
    page: 1,
    pageSize: EXPORT_LIMIT,
  });

  return {
    title: "Disputes export",
    subtitle: `${total} disputes`,
    filename: "jimvio-disputes",
    sheets: [
      {
        name: "Disputes",
        columns: [
          "Order #",
          "Type",
          "Amount",
          "Buyer",
          "Vendor",
          "Order status",
          "Payment",
          "Admin status",
          "Note",
          "Created",
        ],
        rows: rows.map((d) => [
          cell(d.order_number),
          cell(d.dispute_type),
          d.amount_display,
          cell(d.buyer_name),
          cell(d.vendor_name),
          cell(d.status),
          cell(d.payment_status),
          cell(d.admin_status),
          cell(d.admin_note),
          fmtDate(d.created_at),
        ]),
      },
    ],
  };
}

async function fetchMessagesExport(search: URLSearchParams): Promise<ExportDocument> {
  const { rows, total } = await getAdminMessages({
    q: search.get("q") ?? undefined,
    page: 1,
    pageSize: EXPORT_LIMIT,
  });

  return {
    title: "Conversations export",
    subtitle: `${total} conversations`,
    filename: "jimvio-conversations",
    sheets: [
      {
        name: "Conversations",
        columns: ["ID", "Buyer", "Vendor", "Messages", "Last message", "Updated", "Created"],
        rows: rows.map((c) => [
          cell(c.id),
          cell(c.buyer?.full_name ?? c.buyer?.email),
          cell(c.vendor?.business_name),
          cell(c.message_count),
          cell(c.last_message?.body?.slice(0, 120)),
          fmtDate(c.updated_at),
          fmtDate(c.created_at),
        ]),
      },
    ],
  };
}

async function fetchReportsExport(search: URLSearchParams): Promise<ExportDocument> {
  const range = resolveAdminRange(search.get("range") ?? undefined);
  const data = await getAdminReports(range);
  const rangeLabel = ADMIN_RANGES[range].label;

  return {
    title: "Revenue report",
    subtitle: rangeLabel,
    filename: `jimvio-revenue-report-${range}`,
    sheets: [
      {
        name: "Summary",
        columns: ["Metric", "Value"],
        rows: [
          ["Period", rangeLabel],
          ["Total revenue (gross)", data.summary.grossRevenueDisplay],
          ["Net revenue", data.summary.netRevenueDisplay],
          ["Average order value", data.summary.averageOrderValueDisplay],
          ["Orders completed", String(data.summary.completedOrders)],
          ["Paid orders", String(data.summary.paidOrderCount)],
          ["Total orders", String(data.summary.orderCount)],
          ["Refunds", String(data.summary.refundCount)],
          ["New users", String(data.summary.newUsers)],
          ["New vendors", String(data.summary.newVendors)],
          ["Pending UGC reports", String(data.summary.pendingUgcReports)],
        ],
      },
      {
        name: "Daily breakdown",
        columns: ["Date", "Orders", "Gross revenue", "Discounts", "Refunds", "Net revenue"],
        rows: data.dailyBreakdown.map((r) => [
          r.dateLabel,
          String(r.orders),
          r.grossDisplay,
          r.discountsDisplay,
          r.refundsDisplay,
          r.netDisplay,
        ]),
      },
      {
        name: "Revenue trend",
        columns: ["Period", "Gross revenue", "Net revenue"],
        rows: data.revenueTrend.map((p) => [
          p.label,
          String(p.gross),
          String(p.net),
        ]),
      },
      {
        name: "By category",
        columns: ["Category", "Revenue"],
        rows: data.revenueByCategory.map((c) => [c.name, c.revenueDisplay]),
      },
      {
        name: "Fulfillment",
        columns: ["Status", "Count"],
        rows: data.ordersByStatus.map((r) => [r.label, String(r.count)]),
      },
      {
        name: "Payments",
        columns: ["Status", "Count"],
        rows: data.ordersByPayment.map((r) => [r.label, String(r.count)]),
      },
      {
        name: "Top vendors",
        columns: ["Vendor", "Orders", "Revenue"],
        rows: data.topVendors.map((v) => [v.name, String(v.orders), v.revenueDisplay]),
      },
    ],
  };
}

export async function fetchAdminExportDocument(
  resource: ExportResource,
  search: URLSearchParams,
): Promise<ExportDocument> {
  switch (resource) {
    case "orders":
      return fetchOrdersExport(search);
    case "products":
      return fetchProductsExport(search);
    case "vendors":
      return fetchVendorsExport(search);
    case "payments":
      return fetchPaymentsExport(search);
    case "users":
      return fetchUsersExport(search);
    case "disputes":
      return fetchDisputesExport(search);
    case "messages":
      return fetchMessagesExport(search);
    case "reports":
      return fetchReportsExport(search);
    default:
      throw new Error("Unknown export resource");
  }
}
