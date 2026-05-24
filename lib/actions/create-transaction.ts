// lib/actions/create-transaction.ts
"use server";

import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { type CreateTransactionInput, CreateTransactionResult } from "@/lib/payments/transaction-types";
import { CreateTransactionSchema } from "@/lib/payments/transaction-types";



export async function createTransaction(
    supabase: SupabaseClient,
    input: CreateTransactionInput
): Promise<CreateTransactionResult> {
    // ── Validate ───────────────────────────────────────────────────────────────
    const parsed = CreateTransactionSchema.safeParse(input);

    if (!parsed.success) {
        return {
            success: false,
            conflict: false,
            validation: true,
            issues: parsed.error.issues,
        };
    }

    const {
        userId,
        orderId,
        amount,
        currency,
        amountUsd,
        exchangeRate,
        provider,
        providerTransactionId,
        description,
        metadata,
    } = parsed.data;

    // ── Guard: supabase client must be provided ────────────────────────────────
    if (!supabase) {
        return {
            success: false,
            conflict: false,
            validation: false,
            error: "Supabase client is required",
        };
    }

    // ── Insert ─────────────────────────────────────────────────────────────────
    const { data, error } = await supabase
        .from("transactions")
        .insert({
            user_id: userId,
            order_id: orderId,
            type: "payment",
            direction: "credit",
            amount,
            currency,
            amount_usd: amountUsd ?? null,
            exchange_rate: exchangeRate ?? null,
            status: "pending",
            provider,
            provider_transaction_id: providerTransactionId,
            description,
            metadata: {
                ...metadata,
                initiated_at: new Date().toISOString(),
            },
        })
        .select("id")
        .single();

    if (error) {
        if (error.code === "23505") {
            return { success: false, conflict: true };
        }
        return {
            success: false,
            conflict: false,
            validation: false,
            error: error.message,
        };
    }

    if (!data?.id) {
        return {
            success: false,
            conflict: false,
            validation: false,
            error: "Transaction insert returned no id — this is unexpected",
        };
    }

    return { success: true, transactionId: data.id };
}