import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/ugc/platform/auth";
import {
  listActivePayoutMethods,
  savePayoutMethod,
} from "@/services/creator-economy/payouts";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  formatStoredPayoutAccount,
  maskDestinationDisplay,
  normalizeWalletWithdrawalMethod,
  validateWithdrawalDestinationDetails,
  walletWithdrawalMethodLabel,
  type WithdrawalDestinationDetails,
} from "@/lib/payments/wallet-payout-method";

export const dynamic = "force-dynamic";

const SaveSchema = z.object({
  id: z.string().uuid().optional(),
  method: z.string().trim().min(2).max(40),
  details: z.record(z.unknown()),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

function maskMethodRow(row: {
  id: string;
  method: string;
  account_details: unknown;
  is_default: boolean | null;
  is_active: boolean | null;
  created_at: string;
  updated_at?: string | null;
}) {
  const canonical = normalizeWalletWithdrawalMethod(row.method);
  const details =
    row.account_details && typeof row.account_details === "object" && !Array.isArray(row.account_details)
      ? (row.account_details as WithdrawalDestinationDetails)
      : null;
  const display =
    details && canonical
      ? maskDestinationDisplay(canonical, details)
      : formatStoredPayoutAccount(
          row.method,
          typeof row.account_details === "string"
            ? row.account_details
            : JSON.stringify(row.account_details ?? {}),
        );
  return {
    id: row.id,
    method: canonical ?? row.method,
    methodLabel: canonical ? walletWithdrawalMethodLabel(canonical) : row.method,
    display,
    details: details
      ? {
          method: details.method,
          country: details.country,
          provider: details.provider,
          bankId: details.bankId,
          bankName: details.bankName,
          currency: details.currency,
          asset: details.asset,
          network: details.network,
          // Masked sensitive fields only
          phoneMasked: details.phone ? maskDestinationDisplay("mobile_money", details) : undefined,
          accountMasked:
            details.accountNumber || details.iban
              ? maskDestinationDisplay("bank", details)
              : undefined,
          walletMasked: details.walletAddress
            ? maskDestinationDisplay("crypto", details)
            : undefined,
          binanceMasked: details.binanceId
            ? maskDestinationDisplay("binance_id", details)
            : undefined,
        }
      : null,
    isDefault: Boolean(row.is_default),
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

/**
 * GET /api/wallet/os/payout-methods
 * List the caller's saved payout destinations (masked).
 */
export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const rows = await listActivePayoutMethods(user.id);
  return NextResponse.json({
    methods: rows.map((r) =>
      maskMethodRow(
        r as {
          id: string;
          method: string;
          account_details: unknown;
          is_default: boolean | null;
          is_active: boolean | null;
          created_at: string;
          updated_at?: string | null;
        },
      ),
    ),
  });
}

const SetDefaultSchema = z.object({
  action: z.literal("set_default"),
  id: z.string().uuid(),
});

/**
 * POST /api/wallet/os/payout-methods
 * Create or update a structured payout destination after server validation.
 * Also supports { action: "set_default", id } to atomically change the default.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const setDefault = SetDefaultSchema.safeParse(raw);
  if (setDefault.success) {
    const db = createServiceRoleClient();
    const { data: existing } = await db
      .from("creator_payout_methods")
      .select("id")
      .eq("id", setDefault.data.id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "Payout method not found" }, { status: 404 });
    }
    const now = new Date().toISOString();
    await db
      .from("creator_payout_methods")
      .update({ is_default: false, updated_at: now })
      .eq("user_id", user.id);
    await db
      .from("creator_payout_methods")
      .update({ is_default: true, updated_at: now })
      .eq("id", setDefault.data.id)
      .eq("user_id", user.id);
    return NextResponse.json({ ok: true, id: setDefault.data.id });
  }

  const parsed = SaveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payout method request" }, { status: 400 });
  }
  const body = parsed.data;

  const canonical = normalizeWalletWithdrawalMethod(body.method);
  if (!canonical) {
    return NextResponse.json(
      { error: "This payout method is not available" },
      { status: 400 },
    );
  }

  const validated = validateWithdrawalDestinationDetails(canonical, {
    ...(body.details as WithdrawalDestinationDetails),
    method: canonical,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const saved = await savePayoutMethod({
      userId: user.id,
      id: body.id,
      method: canonical,
      accountDetails: validated.details as unknown as Record<string, unknown>,
      isDefault: body.isDefault,
      isActive: body.isActive,
    });
    return NextResponse.json({
      method: maskMethodRow(
        saved as {
          id: string;
          method: string;
          account_details: unknown;
          is_default: boolean | null;
          is_active: boolean | null;
          created_at: string;
          updated_at?: string | null;
        },
      ),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save payout method" },
      { status: 400 },
    );
  }
}

/**
 * DELETE /api/wallet/os/payout-methods?id=
 * Soft-deactivate own payout method (preserves history references).
 */
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const { data: existing } = await db
    .from("creator_payout_methods")
    .select("id, is_default")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Payout method not found" }, { status: 404 });
  }

  await db
    .from("creator_payout_methods")
    .update({
      is_active: false,
      is_default: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, id });
}
