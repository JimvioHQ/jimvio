import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { logWalletActivity } from "@/lib/wallet-os/activity";

export const dynamic = "force-dynamic";

const ALLOWED_METHODS = new Set(["manual", "bank", "flutterwave", "mobile_money", "paypal", "crypto", "other"]);

export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data, error: fetchError } = await db
    .from("wallet_deposits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const deposits = (data ?? []).map((row: {
    id: string;
    amount: number | string;
    currency: string | null;
    method: string;
    status: string;
    reference: string | null;
    invoice_url: string | null;
    receipt_url: string | null;
    created_at: string;
    completed_at: string | null;
  }) => ({
    id: row.id,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? "RWF",
    method: row.method,
    status: row.status,
    reference: row.reference ?? null,
    invoiceUrl: row.invoice_url ?? null,
    receiptUrl: row.receipt_url ?? null,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
  }));

  return NextResponse.json({ deposits });
}

/** Records a pending deposit request. Does not move funds — a payment provider webhook (out of scope here) should mark it completed. */
export async function POST(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let body: { amount?: number; method?: string; reference?: string; metadata?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid deposit amount" }, { status: 400 });
  }

  const method = ALLOWED_METHODS.has(String(body.method)) ? String(body.method) : "manual";
  const wallet = await ensureWallet(user.id, db);

  const { data: inserted, error: insertError } = await db
    .from("wallet_deposits")
    .insert({
      user_id: user.id,
      amount,
      currency: wallet.currency ?? "RWF",
      method,
      status: "pending",
      reference: body.reference ?? null,
      metadata: body.metadata ?? {},
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await logWalletActivity({
    userId: user.id,
    action: "deposit_requested",
    surface: "deposits",
    amount,
    currency: wallet.currency ?? "RWF",
    metadata: { depositId: inserted.id, method },
    db,
  });

  return NextResponse.json({ deposit: inserted });
}
