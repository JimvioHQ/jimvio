import { buildInvoiceData, type InvoiceOrder } from "@/lib/orders/invoice-data";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type { InvoiceOrder };

export function buildOrderInvoiceHtml(order: InvoiceOrder): string {
  const data = buildInvoiceData(order);

  const rows = data.items
    .map(
      (item) => `
    <tr>
      <td>${esc(item.name)}${item.variant ? `<br><span class="muted">${esc(item.variant)}</span>` : ""}</td>
      <td class="num">${item.quantity}</td>
      <td class="num">${esc(item.unitPrice)}</td>
      <td class="num">${esc(item.totalPrice)}</td>
    </tr>
  `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${esc(data.ref)} — Jimvio</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 0; padding: 40px 32px; background: #fff; }
    .wrap { max-width: 720px; margin: 0 auto; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #fd5000; }
    .meta { margin-top: 28px; display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .meta h1 { margin: 0 0 6px; font-size: 20px; }
    .muted { color: #6b7280; font-size: 13px; line-height: 1.5; }
    .bill { margin-top: 28px; padding: 16px; background: #fafafa; border: 1px solid #ececec; border-radius: 10px; }
    .bill strong { display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; font-size: 13px; }
    th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #111; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }
    td { padding: 12px 8px; border-bottom: 1px solid #ececec; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .totals { margin-top: 16px; margin-left: auto; width: 260px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals .grand { border-top: 2px solid #111; margin-top: 8px; padding-top: 10px; font-size: 16px; font-weight: 700; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ececec; font-size: 12px; color: #6b7280; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">Jimvio</div>
    <div class="meta">
      <div>
        <h1>Invoice</h1>
        <div class="muted">Order #${esc(data.ref)}</div>
        <div class="muted">Issued ${esc(data.issuedDate)}</div>
        ${data.paidDate ? `<div class="muted">Paid ${esc(data.paidDate)}</div>` : ""}
      </div>
      <div class="muted" style="text-align:right">
        <div>Payment: <strong style="color:#111">${esc(data.paymentStatus)}</strong></div>
        ${data.paymentProvider ? `<div>Provider: ${esc(data.paymentProvider)}</div>` : ""}
      </div>
    </div>

    <div class="bill">
      <strong>Bill to</strong>
      <div>${esc(data.buyerName)}</div>
      ${data.buyerEmail ? `<div class="muted">${esc(data.buyerEmail)}</div>` : ""}
      ${data.addressLine ? `<div class="muted">${esc(data.addressLine)}</div>` : ""}
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Unit</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      ${data.totals
        .map(
          (t, i) => `
        <div class="${t.grand ? "grand" : ""}">
          <span>${esc(t.label)}</span>
          <span${t.accent ? ' style="color:#16a34a"' : ""}>${esc(t.value)}</span>
        </div>
      `,
        )
        .join("")}
    </div>

    <div class="footer">
      Thank you for your purchase on Jimvio. For support, contact us with your order number.
    </div>
  </div>
</body>
</html>`;
}
