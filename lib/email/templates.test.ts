import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMAIL_CATALOG } from "./catalog.ts";
import { confirmSignupHtml, resetPasswordHtml } from "./auth-templates/index.ts";
import { renderTransactionalEmail } from "./render-transactional.ts";
import { normalizeIdempotencyKey, redactEmailLog, shouldRetryEmailStatus } from "./send.ts";
import { renderJimvioEmail } from "./shell.ts";

const root = join(process.cwd());

describe("Jimvio email templates", () => {
  it("renders the order-created reference without fake sample data", () => {
    const email = renderTransactionalEmail({
      kind: "order_confirmation",
      orderNumber: "JV-100",
      orderId: "order-1",
      currency: "USD",
      totalAmount: 20,
      paymentLabel: "Pending",
      items: [{ name: "Wireless Headphones", detail: "Electronics", quantity: 1, imageUrl: "https://cdn.example.com/h.png" }],
      actionPath: "/checkout?order=order-1",
    });
    assert.ok(email);
    assert.match(email.html, /Order /);
    assert.match(email.html, /created!/);
    assert.match(email.html, /#JV-100/);
    assert.match(email.html, /Pending/);
    assert.match(email.html, /Wireless Headphones/);
    assert.match(email.html, /Next step/);
    assert.match(email.html, /View Order/);
    assert.equal(email.html.includes("undefined"), false);
    assert.equal(email.html.includes("482916"), false);
    assert.match(email.text, /JV-100/);
  });

  it("renders payment success as order received, not a second payment email", () => {
    const email = renderTransactionalEmail({
      kind: "payment_success",
      orderNumber: "JV-100",
      orderId: "order-1",
      amount: 20,
      currency: "USD",
      itemCount: 1,
    });
    assert.ok(email);
    assert.match(email.subject, /received/);
    assert.match(email.html, /received!/);
    assert.match(email.html, /Completed/);
    assert.match(email.html, /Processing/);
    assert.equal(/Payment confirmed/i.test(email.html), false);
  });

  it("omits an order email when the order number is missing", () => {
    assert.equal(renderTransactionalEmail({ kind: "payment_success", orderId: "x", amount: 1, currency: "USD" }), null);
  });

  it("escapes buyer-provided item names", () => {
    const email = renderTransactionalEmail({
      kind: "order_confirmation",
      orderNumber: "JV-2",
      items: [{ name: `<script>alert("x")</script>`, quantity: 1 }],
    });
    assert.ok(email);
    assert.equal(email.html.includes("<script>"), false);
    assert.match(email.html, /&lt;script&gt;/);
  });

  it("keeps withdrawal requests distinct from a paid payout", () => {
    const requested = renderTransactionalEmail({
      kind: "withdrawal_requested",
      amount: 25,
      currency: "USD",
    });
    const paid = renderTransactionalEmail({ kind: "payout_sent", amount: 25, currency: "USD" });
    assert.match(requested!.html, /has not been paid yet/);
    assert.match(paid!.html, /marked paid/);
    assert.equal(/marked paid/.test(requested!.html), false);
  });

  it("renders the welcome reference with a real first name", () => {
    const email = renderTransactionalEmail({
      kind: "welcome",
      destinationLabel: "Amina Keza",
    });
    assert.match(email!.html, /Welcome to /);
    assert.match(email!.html, /Jimvio!/);
    assert.match(email!.html, /Hi Amina,/);
    assert.match(email!.html, /Your journey starts here/);
    assert.match(email!.html, /Explore Jimvio/);
    assert.equal(email!.html.includes("{{first_name}}"), false);
  });

  it("renders the login-detected reference layout without sending it", () => {
    const { html, text } = renderJimvioEmail({
      preview: "New login",
      icon: "shield-user",
      titleLead: "Login ",
      titleAccent: "detected",
      subtitle: "We noticed a new login to your Jimvio account. If this was you, no further action is needed.",
      details: {
        label: "LOGIN DETAILS",
        stats: [
          { icon: "pin", label: "Location", value: "Kigali, Rwanda" },
          { icon: "monitor", label: "Device", value: "Mac OS (Chrome)" },
          { icon: "calendar", label: "Date & Time", value: "Oct 11, 2026" },
          { icon: "shield-check", label: "IP Address", value: "197.243.***.***" },
        ],
      },
      notice: {
        icon: "alert",
        title: "Wasn't you?",
        body: "If you don't recognize this login, your account may be at risk.",
      },
      cta: { label: "Secure Your Account", url: "https://www.jimvio.com/identity/settings" },
      help: "If you have any questions about this login, contact our support team.",
      helpUrl: "https://www.jimvio.com/contact",
      assetBaseUrl: "https://www.jimvio.com",
    });
    assert.match(html, /Login /);
    assert.match(html, /detected/);
    assert.match(html, /Wasn&#39;t you\?/);
    assert.match(html, /Need Help\?/);
    assert.match(html, /#FF5A1F/);
    assert.match(html, /border-radius:28px/);
    assert.match(text, /Secure Your Account/);
  });

  it("preserves Supabase confirmation and recovery placeholders", () => {
    const confirm = confirmSignupHtml();
    const reset = resetPasswordHtml();
    for (const html of [confirm, reset]) {
      assert.match(html, /\{\{ \.ConfirmationURL \}\}/);
      assert.match(html, /\{\{ \.Token \}\}/);
      assert.match(html, /slice \.Token 0 1/);
      assert.equal(html.includes("482916"), false);
      assert.equal(html.includes("736291"), false);
    }
    assert.match(confirm, /Confirm your /);
    assert.match(confirm, /10 minutes/);
    assert.equal(confirm.includes("482916"), false);
    assert.match(reset, /Reset your /);
    const onDisk = readFileSync(join(root, "supabase/templates/recovery.html"), "utf8");
    assert.match(onDisk, /\{\{ \.ConfirmationURL \}\}/);
    assert.match(onDisk, /Reset Password/);
  });

  it("rejects unsafe links and retries only transient provider statuses", () => {
    const email = renderJimvioEmail({
      preview: "x",
      icon: "alert",
      titleLead: "Hi",
      cta: { label: "Go", url: "javascript:alert(1)" },
      help: "Help",
      helpUrl: "https://www.jimvio.com/contact",
      assetBaseUrl: "https://www.jimvio.com",
    });
    assert.equal(email.html.includes("javascript:"), false);
    assert.equal(shouldRetryEmailStatus(429), true);
    assert.equal(shouldRetryEmailStatus(500), true);
    assert.equal(shouldRetryEmailStatus(422), false);
    assert.equal(normalizeIdempotencyKey("order.created:buyer:abc"), "order.created:buyer:abc");
    assert.equal(normalizeIdempotencyKey("no"), undefined);
    assert.match(redactEmailLog("failed for a@b.com code 123456 Bearer secret"), /\[email\]/);
    assert.equal(redactEmailLog("Bearer secret").includes("secret"), false);
  });

  it("does not mark unimplemented product events as live", () => {
    const login = EMAIL_CATALOG.find((entry) => entry.id === "login.detected");
    const marketing = EMAIL_CATALOG.find((entry) => entry.id === "marketing.newsletter");
    assert.equal(login?.status, "NOT_APPLICABLE");
    assert.equal(marketing?.status, "NOT_APPLICABLE");
    assert.ok(EMAIL_CATALOG.filter((entry) => entry.status === "IMPLEMENTED").length > 20);
  });
});
