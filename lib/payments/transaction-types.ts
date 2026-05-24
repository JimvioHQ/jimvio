
import { z } from "zod";
export const CreateTransactionSchema = z.object({
    userId: z
        .string({ required_error: "userId is required" })
        .uuid("userId must be a valid UUID"),

    orderId: z
        .string({ required_error: "orderId is required" })
        .uuid("orderId must be a valid UUID"),

    amount: z
        .number({ required_error: "amount is required" })
        .positive("amount must be greater than 0")
        .finite("amount must be a finite number"),

    currency: z
        .string({ required_error: "currency is required" })
        .trim()
        .min(3, "currency must be at least 3 characters (e.g. USD)")
        .max(10, "currency must be at most 10 characters")
        .regex(
            /^[A-Z]{2,10}$/,
            "currency must be uppercase letters only (e.g. USD, USDT, RWF)"
        ),

    amountUsd: z
        .number()
        .positive("amountUsd must be greater than 0")
        .finite("amountUsd must be a finite number")
        .nullable()
        .optional(),

    exchangeRate: z
        .number()
        .positive("exchangeRate must be greater than 0")
        .finite("exchangeRate must be a finite number")
        .nullable()
        .optional(),

    provider: z.enum(["binance", "flutterwave"], {
        required_error: "provider is required",
        invalid_type_error: "provider must be one of: binance, flutterwave",
    }),

    providerTransactionId: z
        .string({ required_error: "providerTransactionId is required" })
        .trim()
        .min(1, "providerTransactionId cannot be empty")
        .max(255, "providerTransactionId must be at most 255 characters"),

    description: z
        .string({ required_error: "description is required" })
        .trim()
        .min(1, "description cannot be empty")
        .max(500, "description must be at most 500 characters"),

    metadata: z
        .record(z.unknown())
        .refine((v) => {
            try {
                JSON.stringify(v);
                return true;
            } catch {
                return false;
            }
        }, "metadata must be JSON-serializable"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateTransactionInput = z.input<typeof CreateTransactionSchema>;

export type CreateTransactionResult =
    | { success: true; transactionId: string }
    | { success: false; conflict: true }
    | { success: false; conflict: false; validation: true; issues: z.ZodIssue[] }
    | { success: false; conflict: false; validation: false; error: string };

export function formatTransactionValidationError(issues: z.ZodIssue[]): string {
    return issues
        .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
        .join("; ");
}