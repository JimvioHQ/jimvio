import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chunkReloadStorageKey,
  decideChunkRecovery,
  isChunkLoadFailure,
  readChunkDeploymentId,
} from "./chunk-recovery.ts";
import {
  decideSupplierTrackingUpdate,
  customerTrackingLabel,
  trackingSyncBackoffMs,
} from "../order-fulfillment/tracking-decision.ts";
import {
  manualApprovalEligibility,
  manualApprovalTransactionId,
  validateManualApprovalInput,
} from "../payments/manual-approval-policy.ts";
import { buildInvoiceData } from "../orders/invoice-data.ts";
import { mapCjFulfillmentToOrderStatus } from "../payments/order-payment-utils.ts";
import { isOfficialJimvioStoreLabel } from "../marketplace/store-display.ts";

describe("chunk recovery", () => {
  it("reloads a chunk failure once while online", () => {
    assert.equal(isChunkLoadFailure(new Error("ChunkLoadError: Loading chunk 25n8 failed")), true);
    assert.equal(decideChunkRecovery({ isChunkError: true, online: true, alreadyAttempted: false }), "reload");
    assert.equal(decideChunkRecovery({ isChunkError: true, online: true, alreadyAttempted: true }), "manual");
  });

  it("does not reload while offline or for ordinary errors", () => {
    assert.equal(decideChunkRecovery({ isChunkError: true, online: false, alreadyAttempted: false }), "offline");
    assert.equal(decideChunkRecovery({ isChunkError: false, online: true, alreadyAttempted: false }), "ignore");
  });

  it("scopes the reload guard to the deployment id in the chunk URL", () => {
    const id = readChunkDeploymentId("/_next/static/chunks/abc.js?dpl=dpl_old");
    assert.equal(id, "dpl_old");
    assert.notEqual(chunkReloadStorageKey("dpl_old", "/help"), chunkReloadStorageKey("dpl_new", "/help"));
  });
});

describe("CJ supplier order status mapping", () => {
  it("maps common CJ processing, shipment, and delivery states", () => {
    assert.equal(mapCjFulfillmentToOrderStatus("UNSHIPPED"), "processing");
    assert.equal(mapCjFulfillmentToOrderStatus("PACKED"), "processing");
    assert.equal(mapCjFulfillmentToOrderStatus("WAIT_SHIP"), "processing");
    assert.equal(mapCjFulfillmentToOrderStatus("IN_TRANSIT"), "shipped");
    assert.equal(mapCjFulfillmentToOrderStatus("FINISHED"), "delivered");
    assert.equal(mapCjFulfillmentToOrderStatus("DONE"), "delivered");
  });
});

describe("supplier tracking decisions", () => {
  it("rejects an older event and a duplicate webhook", () => {
    const older = decideSupplierTrackingUpdate({
      currentStatus: "shipped",
      currentTrackingStatus: "In transit",
      currentTrackingNumber: "T1",
      currentEventAt: "2026-10-14T12:00:00.000Z",
      incomingStatus: "SHIPPED",
      incomingTrackingNumber: "T1",
      occurredAt: "2026-10-14T11:00:00.000Z",
    });
    assert.equal(older.apply, false);
    assert.equal(older.reason, "older_event");

    const duplicate = decideSupplierTrackingUpdate({
      currentStatus: "shipped",
      currentTrackingStatus: "In transit",
      currentTrackingNumber: "T1",
      currentSupplierStatus: "IN_TRANSIT",
      currentEventAt: "2026-10-14T12:00:00.000Z",
      incomingStatus: "IN_TRANSIT",
      incomingTrackingNumber: "T1",
      occurredAt: "2026-10-14T12:00:00.000Z",
    });
    assert.equal(duplicate.apply, false);
    assert.equal(duplicate.reason, "unchanged");

    const sameCustomerPhaseNewSupplierState = decideSupplierTrackingUpdate({
      currentStatus: "processing",
      currentTrackingStatus: "Awaiting shipment",
      currentTrackingNumber: null,
      currentSupplierStatus: "UNSHIPPED",
      currentEventAt: "2026-10-14T12:00:00.000Z",
      incomingStatus: "PACKED",
      incomingTrackingNumber: null,
      occurredAt: "2026-10-14T13:00:00.000Z",
    });
    assert.equal(sameCustomerPhaseNewSupplierState.apply, true);
    assert.equal(sameCustomerPhaseNewSupplierState.reason, "accepted");
    assert.equal(sameCustomerPhaseNewSupplierState.notify, null);
    assert.equal(sameCustomerPhaseNewSupplierState.trackingStatus, "Awaiting shipment");
  });

  it("accepts out for delivery once and hides supplier wording", () => {
    const next = decideSupplierTrackingUpdate({
      currentStatus: "shipped",
      currentTrackingStatus: "In transit",
      currentTrackingNumber: "T1",
      currentEventAt: "2026-10-14T12:00:00.000Z",
      incomingStatus: "OUT_FOR_DELIVERY",
      incomingTrackingNumber: "T1",
      occurredAt: "2026-10-14T13:00:00.000Z",
    });
    assert.equal(next.apply, true);
    assert.equal(next.notify, "out_for_delivery");
    assert.equal(next.trackingStatus, "Out for delivery");
    assert.equal(customerTrackingLabel("cj_shipped"), null);
    assert.ok(trackingSyncBackoffMs(1) < trackingSyncBackoffMs(4));
  });
});

describe("manual payment approval policy", () => {
  it("allows only a pending payable order with a real confirmation", () => {
    assert.equal(manualApprovalEligibility({ status: "pending", payment_status: "pending", total_amount: 12 }).ok, true);
    assert.equal(manualApprovalEligibility({ status: "cancelled", payment_status: "pending", total_amount: 12 }).ok, false);
    assert.equal(manualApprovalEligibility({ status: "pending", payment_status: "paid", total_amount: 12 }).ok, false);
    assert.equal(manualApprovalEligibility({ status: "pending", payment_status: "failed", total_amount: 12 }).ok, false);
    const missing = validateManualApprovalInput({ confirmedReceived: false, reason: "bank transfer seen" });
    assert.equal(missing.ok, false);
    const ok = validateManualApprovalInput({ confirmedReceived: true, reason: "Bank transfer matched", externalReference: "TX-100" });
    assert.equal(ok.ok, true);
    assert.equal(manualApprovalTransactionId("order-1"), manualApprovalTransactionId("order-1"));
  });
});

describe("invoice payment label", () => {
  it("does not mark an unpaid invoice paid and omits supplier branding", () => {
    const unpaid = buildInvoiceData({
      id: "1",
      order_number: "JV1",
      payment_status: "pending",
      total_amount: 10,
      currency: "USD",
      order_items: [],
      payment_provider: "cj",
    });
    assert.equal(unpaid.paymentStatus, "Unpaid");
    assert.equal(unpaid.paidDate, null);
    assert.equal(unpaid.paymentProvider, null);

    const paid = buildInvoiceData({
      id: "1",
      order_number: "JV1",
      payment_status: "completed",
      paid_at: "2026-10-14T00:00:00.000Z",
      total_amount: 10,
      currency: "USD",
      order_items: [{ product_name: "Earbuds", quantity: 1, unit_price: 10, total_price: 10 }],
    });
    assert.equal(paid.paymentStatus, "Paid");
    assert.ok(paid.paidDate);
  });
});

describe("marketplace store label", () => {
  it("hides only the official Jimvio Store label", () => {
    assert.equal(isOfficialJimvioStoreLabel({ business_name: "Jimvio Store" }), true);
    assert.equal(isOfficialJimvioStoreLabel({ business_name: "North Studio" }), false);
  });
});
