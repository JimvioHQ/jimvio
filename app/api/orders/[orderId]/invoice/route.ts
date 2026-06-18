import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInvoiceData } from "@/lib/orders/invoice-data";
import { buildOrderInvoicePdf } from "@/lib/orders/invoice-pdf";
import { buildOrderInvoiceHtml } from "@/lib/orders/invoice-html";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      created_at,
      paid_at,
      currency,
      subtotal,
      shipping_amount,
      tax_amount,
      discount_amount,
      total_amount,
      payment_status,
      metadata,
      shipping_address,
      billing_address,
      buyer_id,
      order_items (
        product_name,
        quantity,
        unit_price,
        total_price,
        variant_name
      ),
      profiles!orders_buyer_id_fkey ( full_name, email )
    `)
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  const paymentProvider =
    typeof metadata.payment_provider === "string" ? metadata.payment_provider : null;

  const invoiceOrder = { ...order, payment_provider: paymentProvider };
  const invoiceData = buildInvoiceData(invoiceOrder);
  const ref = invoiceData.ref;
  const format = req.nextUrl.searchParams.get("format");

  if (format === "html") {
    const html = buildOrderInvoiceHtml(invoiceOrder);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="jimvio-invoice-${ref}.html"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const pdf = await buildOrderInvoicePdf(invoiceData);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="jimvio-invoice-${ref}.pdf"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(pdf.length),
    },
  });
}
