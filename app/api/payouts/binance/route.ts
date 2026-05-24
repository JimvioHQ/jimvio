import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { transferToBinanceUser } from "@/lib/binance-pay";

async function getExchangeRate(
    fromCurrency: string,
    toCurrency: string
): Promise<number> {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return 1;
    try {
        const res = await fetch(
            `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`
        );
        if (!res.ok) throw new Error("Exchange rate fetch failed");
        const data = await res.json();
        return data.rates?.[toCurrency.toUpperCase()] ?? 1;
    } catch {
        return 1;
    }
}

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: () => { },
            },
        }
    );

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, binanceUserId, type } = await req.json();

    // ── Validate inputs ──────────────────────────────────────────────────────────
    if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!binanceUserId) {
        return NextResponse.json({ error: "binanceUserId is required" }, { status: 400 });
    }
    if (!["vendor", "affiliate", "influencer"].includes(type)) {
        return NextResponse.json({ error: "Invalid payout type" }, { status: 400 });
    }

    // ── Load wallet ──────────────────────────────────────────────────────────────
    const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, available_balance, currency")
        .eq("user_id", user.id)
        .single();

    if (walletError || !wallet) {
        return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // ── Convert requested USDT amount → wallet currency using live rate ──────────
    const exchangeRate = await getExchangeRate("USDT", wallet.currency);
    const amountInWalletCurrency = Number((amount * exchangeRate).toFixed(2));

    if (wallet.available_balance < amountInWalletCurrency) {
        return NextResponse.json(
            {
                error: "Insufficient balance",
                available: wallet.available_balance,
                required: amountInWalletCurrency,
                currency: wallet.currency,
                exchangeRate,
            },
            { status: 400 }
        );
    }

    // ── Create payout record ─────────────────────────────────────────────────────
    const { data: payout, error: payoutError } = await supabase
        .from("payouts")
        .insert({
            user_id: user.id,
            type,
            amount: amountInWalletCurrency,
            currency: wallet.currency,
            status: "processing",
            payout_method: "binance_pay",
            payout_account: binanceUserId,
            notes: `Binance Pay – ${amount} USDT @ ${exchangeRate} ${wallet.currency}/USDT`,
        })
        .select("id")
        .single();

    if (payoutError || !payout) {
        return NextResponse.json({ error: "Failed to create payout record" }, { status: 500 });
    }

    // ── Call Binance Transfer API ────────────────────────────────────────────────
    try {
        const result = await transferToBinanceUser({
            merchantSendId: payout.id,
            binanceUserId,
            transferAmount: amount,
            currency: "USDT",
            remark: `${type.charAt(0).toUpperCase() + type.slice(1)} payout`,
        });

        // ── Update payout as paid ──────────────────────────────────────────────────
        await supabase
            .from("payouts")
            .update({
                status: "paid",
                provider_reference: result.tranId,
                processed_at: new Date().toISOString(),
            })
            .eq("id", payout.id);

        // ── Deduct from wallet via safe RPC (guards against negative balance) ───────
        await supabase.rpc("decrement_wallet_balance", {
            p_wallet_id: wallet.id,
            p_amount: amountInWalletCurrency,
        });

        // ── Notify user ────────────────────────────────────────────────────────────
        await supabase.from("notifications").insert({
            user_id: user.id,
            type: "payment",
            title: "Payout sent",
            message: `${amount} USDT has been sent to your Binance account.`,
            action_url: "/dashboard/wallet",
        });

        return NextResponse.json({
            success: true,
            payoutId: payout.id,
            binanceTranId: result.tranId,
            status: result.orderStatus,
            amountUsdt: amount,
            amountDeducted: amountInWalletCurrency,
            currency: wallet.currency,
            exchangeRate,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Transfer failed";
        console.error("[binance/payout]", message);

        // Mark payout as failed so it can be retried or investigated
        await supabase
            .from("payouts")
            .update({ status: "failed", notes: message })
            .eq("id", payout.id);

        return NextResponse.json({ error: message }, { status: 500 });
    }
}