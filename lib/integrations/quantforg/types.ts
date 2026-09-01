import { z } from "zod";

export const QUANTFORG_EVENT_TYPES = [
  "SIGNAL_DETECTED",
  "SIGNAL_CONFIRMED",
  "TRADE_OPENED",
  "TRADE_REJECTED",
  "STOP_LOSS_SET",
  "TAKE_PROFIT_SET",
  "BREAKEVEN_SET",
  "TRAILING_STOP_UPDATED",
  "PARTIAL_CLOSE",
  "TAKE_PROFIT_HIT",
  "STOP_LOSS_HIT",
  "TRADE_CLOSED",
  "RISK_REJECTED",
  "ROBOT_STARTED",
  "ROBOT_STOPPED",
  "MT5_CONNECTED",
  "MT5_DISCONNECTED",
  "SYSTEM_ERROR",
] as const;

export type QuantForgEventType = (typeof QUANTFORG_EVENT_TYPES)[number];

const directionSchema = z.enum(["BUY", "SELL"]).optional();

const numericField = z
  .union([z.number(), z.null()])
  .optional()
  .transform((v) => (v === null || v === undefined ? null : v));

export const quantForgWebhookPayloadSchema = z.object({
  event_id: z
    .string()
    .trim()
    .min(1, "event_id is required")
    .max(200, "event_id too long"),
  event_type: z.enum(QUANTFORG_EVENT_TYPES),
  timestamp: z
    .string()
    .trim()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), "timestamp must be ISO-8601"),
  symbol: z.string().trim().max(32).optional(),
  direction: directionSchema,
  entry: numericField,
  stop_loss: numericField,
  take_profit: numericField,
  current_price: numericField,
  risk_percent: numericField,
  confidence: numericField,
  status: z.string().trim().max(64).optional(),
  profit_loss: z.union([z.number(), z.string(), z.null()]).optional(),
  duration_minutes: numericField,
  message: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type QuantForgWebhookPayload = z.infer<typeof quantForgWebhookPayloadSchema>;
