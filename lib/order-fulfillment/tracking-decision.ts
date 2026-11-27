import type { OrderStatusValue } from "@/lib/payments/record-status-change";

export type TrackingPhase =
  | "placed"
  | "processing"
  | "awaiting_shipment"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "exception";

export type TrackingNotify =
  | "processing"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "cancelled";

const PHASE_RANK: Record<TrackingPhase, number> = {
  placed: 1,
  processing: 2,
  awaiting_shipment: 2,
  shipped: 3,
  in_transit: 4,
  out_for_delivery: 5,
  delivered: 6,
  exception: 3,
  cancelled: 100,
};

const ORDER_STATUS_FOR_PHASE: Partial<Record<TrackingPhase, OrderStatusValue>> = {
  processing: "processing",
  awaiting_shipment: "processing",
  shipped: "shipped",
  in_transit: "shipped",
  out_for_delivery: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};

export function mapSupplierStatusToPhase(raw: string | null | undefined): TrackingPhase | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["out_for_delivery", "outfordelivery", "ofd"].includes(key)) return "out_for_delivery";
  if (["in_transit", "intransit", "transit"].includes(key)) return "in_transit";
  if (["shipped", "dispatched"].includes(key)) return "shipped";
  if (["delivered", "done", "finished", "completed"].includes(key)) return "delivered";
  if (["cancelled", "canceled"].includes(key)) return "cancelled";
  if (["exception", "failed", "delivery_exception", "undelivered", "returned"].includes(key)) {
    return "exception";
  }
  if (
    [
      "processing",
      "submitted",
      "accepted",
      "submitting",
      "unshipped",
      "in_production",
      "picking",
      "packed",
      "wait_ship",
      "created",
      "awaiting_shipment",
      "waiting_for_submission",
    ].includes(key)
  ) {
    return key === "unshipped" || key === "wait_ship" || key === "packed" ? "awaiting_shipment" : "processing";
  }
  return null;
}

export function phaseFromOrder(status: string | null | undefined, trackingStatus: string | null | undefined): TrackingPhase {
  const fromTracking = mapSupplierStatusToPhase(trackingStatus);
  if (fromTracking) return fromTracking;
  const key = (status ?? "pending").toLowerCase();
  if (key === "delivered" || key === "completed") return "delivered";
  if (key === "cancelled" || key === "refunded") return "cancelled";
  if (key === "shipped") return "shipped";
  if (key === "processing") return "processing";
  return "placed";
}

/** Customer-facing tracking text. Supplier names are never included. */
export function customerTrackingLabel(value: string | null | undefined): string | null {
  const phase = mapSupplierStatusToPhase(value);
  if (!phase) {
    const text = value?.trim();
    if (!text) return null;
    if (/cj|dropshipping|supplier/i.test(text)) return null;
    return text.replace(/_/g, " ");
  }
  switch (phase) {
    case "placed":
      return "Placed";
    case "processing":
      return "Processing";
    case "awaiting_shipment":
      return "Awaiting shipment";
    case "shipped":
      return "Shipped";
    case "in_transit":
      return "In transit";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "exception":
      return "Delivery exception";
    default:
      return null;
  }
}

export type TrackingDecision = {
  apply: boolean;
  reason: string;
  orderStatus: OrderStatusValue | null;
  trackingStatus: string | null;
  notify: TrackingNotify | null;
  phase: TrackingPhase | null;
};

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function decideSupplierTrackingUpdate(input: {
  currentStatus: string | null | undefined;
  currentTrackingStatus: string | null | undefined;
  currentTrackingNumber: string | null | undefined;
  currentSupplierStatus?: string | null;
  currentEventAt: string | null | undefined;
  incomingStatus: string | null | undefined;
  incomingTrackingNumber?: string | null;
  occurredAt?: string | null;
}): TrackingDecision {
  const phase = mapSupplierStatusToPhase(input.incomingStatus);
  if (!phase) {
    return { apply: false, reason: "unknown_status", orderStatus: null, trackingStatus: null, notify: null, phase: null };
  }

  const currentPhase = phaseFromOrder(input.currentStatus, input.currentTrackingStatus);
  const incomingAt = parseTime(input.occurredAt);
  const currentAt = parseTime(input.currentEventAt);
  if (incomingAt != null && currentAt != null && incomingAt < currentAt) {
    return { apply: false, reason: "older_event", orderStatus: null, trackingStatus: null, notify: null, phase };
  }

  const incomingRank = PHASE_RANK[phase];
  const currentRank = PHASE_RANK[currentPhase];
  const terminal = currentPhase === "delivered" || currentPhase === "cancelled";
  if (terminal && phase !== "cancelled" && phase !== currentPhase) {
    return { apply: false, reason: "terminal", orderStatus: null, trackingStatus: null, notify: null, phase };
  }
  if (phase !== "cancelled" && phase !== "exception" && incomingRank < currentRank && incomingAt == null) {
    return { apply: false, reason: "older_phase", orderStatus: null, trackingStatus: null, notify: null, phase };
  }
  if (phase !== "cancelled" && phase !== "exception" && incomingAt != null && currentAt != null && incomingRank < currentRank) {
    return { apply: false, reason: "older_phase", orderStatus: null, trackingStatus: null, notify: null, phase };
  }

  const trackingNumber = input.incomingTrackingNumber?.trim() || null;
  const sameTracking = (trackingNumber ?? "") === (input.currentTrackingNumber?.trim() ?? "");
  const samePhase = phase === currentPhase;
  const sameSupplierStatus =
    String(input.incomingStatus ?? "").trim().toLowerCase() ===
    String(input.currentSupplierStatus ?? "").trim().toLowerCase();
  if (samePhase && sameTracking && sameSupplierStatus) {
    return { apply: false, reason: "unchanged", orderStatus: null, trackingStatus: null, notify: null, phase };
  }

  let notify: TrackingNotify | null = null;
  if (!samePhase) {
    if (phase === "in_transit" && (currentPhase === "shipped" || currentPhase === "processing" || currentPhase === "awaiting_shipment")) {
      notify = currentPhase === "shipped" ? "in_transit" : "shipped";
    } else if (phase === "shipped" || phase === "awaiting_shipment" || phase === "processing" || phase === "placed") {
      notify = phase === "shipped" ? "shipped" : "processing";
    } else if (phase === "out_for_delivery" || phase === "delivered" || phase === "exception" || phase === "cancelled") {
      notify = phase;
    }
  }

  return {
    apply: true,
    reason: "accepted",
    orderStatus: ORDER_STATUS_FOR_PHASE[phase] ?? null,
    trackingStatus: customerTrackingLabel(phase),
    notify,
    phase,
  };
}

export function trackingSyncBackoffMs(failures: number): number {
  const attempt = Math.max(1, Math.min(6, failures));
  return Math.min(6 * 60 * 60 * 1000, 2 ** attempt * 2 * 60 * 1000);
}
