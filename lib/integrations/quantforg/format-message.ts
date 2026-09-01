import type { QuantForgEventType, QuantForgWebhookPayload } from "./types";

const FOOTER = "━━━━━━━━━━━━━━\n\n🤖 QuantForg\nAutomated Trading System";

function fmtPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(2);
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value)}%`;
}

function fmtPl(value: QuantForgWebhookPayload["profit_loss"]): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  }
  return String(value);
}

function symbolLine(payload: QuantForgWebhookPayload): string {
  const sym = payload.symbol?.trim() || "—";
  const dir = payload.direction?.trim();
  return dir ? `${sym} — ${dir}` : sym;
}

function tradeLevels(payload: QuantForgWebhookPayload): string[] {
  const lines: string[] = [];
  if (payload.entry != null) lines.push(`Entry: ${fmtPrice(payload.entry)}`);
  if (payload.stop_loss != null) lines.push(`Stop Loss: ${fmtPrice(payload.stop_loss)}`);
  if (payload.take_profit != null) lines.push(`Take Profit: ${fmtPrice(payload.take_profit)}`);
  if (payload.current_price != null) lines.push(`Current Price: ${fmtPrice(payload.current_price)}`);
  return lines;
}

function statusLine(payload: QuantForgWebhookPayload, suffix = ""): string {
  const status = payload.status?.trim();
  if (!status) return "";
  return `\nStatus: ${status}${suffix ? ` ${suffix}` : ""}`;
}

function customMessage(payload: QuantForgWebhookPayload): string {
  const msg = payload.message?.trim();
  return msg ? `\n\n${msg}` : "";
}

function formatSignal(payload: QuantForgWebhookPayload, title: string, emoji: string): string {
  const dir = payload.direction?.trim() || "—";
  const sym = payload.symbol?.trim() || "—";
  const levels = tradeLevels(payload);
  const risk =
    payload.risk_percent != null ? `\nRisk: ${fmtPct(payload.risk_percent)}` : "";
  const conf =
    payload.confidence != null ? `\nConfidence: ${fmtPct(payload.confidence)}` : "";

  return `${emoji} ${title}\n\n${dir} — ${sym}\n\n${levels.join("\n")}${risk}${conf}${statusLine(payload, "✅")}${customMessage(payload)}\n\n${FOOTER}`;
}

function formatUpdate(payload: QuantForgWebhookPayload, title: string, emoji: string, detail: string): string {
  const levels = tradeLevels(payload);
  return `${emoji} ${title}\n\n${symbolLine(payload)}\n\n${levels.join("\n")}\n\n${detail}${statusLine(payload, "✅")}${customMessage(payload)}\n\n${FOOTER}`;
}

function formatTradeClosed(payload: QuantForgWebhookPayload): string {
  const exitPrice =
    payload.current_price != null
      ? fmtPrice(payload.current_price)
      : payload.take_profit != null
        ? fmtPrice(payload.take_profit)
        : payload.stop_loss != null
          ? fmtPrice(payload.stop_loss)
          : "—";
  const result = payload.status?.trim() || "CLOSED";
  const duration =
    payload.duration_minutes != null ? `\nDuration: ${payload.duration_minutes} min` : "";

  return `🔴 QUANTFORG TRADE CLOSED\n\n${symbolLine(payload)}\n\nEntry: ${fmtPrice(payload.entry)}\nExit: ${exitPrice}\n\nResult: ${result} ✅\nP/L: ${fmtPl(payload.profit_loss)}${duration}${customMessage(payload)}\n\n${FOOTER}`;
}

function formatSystem(payload: QuantForgWebhookPayload, title: string, emoji: string): string {
  const sym = payload.symbol?.trim();
  const header = sym ? `${title}\n\n${sym}` : title;
  const detail = payload.message?.trim() || payload.status?.trim() || "Event received.";
  return `${emoji} ${header}\n\n${detail}${customMessage(payload)}\n\n${FOOTER}`;
}

/** Render a Jimvio Space chat body for a QuantForg webhook event. */
export function formatQuantForgSpaceMessage(payload: QuantForgWebhookPayload): string {
  const type = payload.event_type as QuantForgEventType;

  switch (type) {
    case "SIGNAL_DETECTED":
      return formatSignal(payload, "QUANTFORG SIGNAL", "🟡");
    case "SIGNAL_CONFIRMED":
      return formatSignal(payload, "QUANTFORG SIGNAL", "🟢");
    case "TRADE_OPENED":
      return formatSignal(payload, "QUANTFORG TRADE OPENED", "🟢");
    case "TRADE_REJECTED":
      return formatUpdate(payload, "QUANTFORG TRADE REJECTED", "🔴", "Trade was not executed.");
    case "STOP_LOSS_SET":
      return formatUpdate(
        payload,
        "QUANTFORG UPDATE",
        "🟡",
        `🛡 Stop Loss set\n\nStop Loss: ${fmtPrice(payload.stop_loss)}`
      );
    case "TAKE_PROFIT_SET":
      return formatUpdate(
        payload,
        "QUANTFORG UPDATE",
        "🟡",
        `🎯 Take Profit set\n\nTake Profit: ${fmtPrice(payload.take_profit)}`
      );
    case "BREAKEVEN_SET":
      return formatUpdate(
        payload,
        "QUANTFORG UPDATE",
        "🟡",
        `🛡 Breakeven activated\n\nStop Loss moved to:\n${fmtPrice(payload.stop_loss ?? payload.entry)}`
      );
    case "TRAILING_STOP_UPDATED":
      return formatUpdate(
        payload,
        "QUANTFORG UPDATE",
        "🟡",
        `📈 Trailing stop updated\n\nStop Loss: ${fmtPrice(payload.stop_loss)}`
      );
    case "PARTIAL_CLOSE":
      return formatUpdate(
        payload,
        "QUANTFORG PARTIAL CLOSE",
        "🟡",
        `Partial position closed\n\nP/L: ${fmtPl(payload.profit_loss)}`
      );
    case "TAKE_PROFIT_HIT":
      return formatUpdate(payload, "QUANTFORG TAKE PROFIT", "🟢", "🎯 Take profit target reached.");
    case "STOP_LOSS_HIT":
      return formatUpdate(payload, "QUANTFORG STOP LOSS", "🔴", "🛑 Stop loss triggered.");
    case "TRADE_CLOSED":
      return formatTradeClosed(payload);
    case "RISK_REJECTED":
      return formatUpdate(
        payload,
        "QUANTFORG RISK REJECTED",
        "🔴",
        payload.message?.trim() || "Trade rejected by risk rules."
      );
    case "ROBOT_STARTED":
      return formatSystem(payload, "QUANTFORG ROBOT STARTED", "🟢");
    case "ROBOT_STOPPED":
      return formatSystem(payload, "QUANTFORG ROBOT STOPPED", "🔴");
    case "MT5_CONNECTED":
      return formatSystem(payload, "QUANTFORG MT5 CONNECTED", "🟢");
    case "MT5_DISCONNECTED":
      return formatSystem(payload, "QUANTFORG MT5 DISCONNECTED", "🔴");
    case "SYSTEM_ERROR":
      return formatSystem(payload, "QUANTFORG SYSTEM ERROR", "🔴");
    default:
      return formatSystem(payload, "QUANTFORG EVENT", "ℹ️");
  }
}
