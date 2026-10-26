import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  confirmNewsletter,
  createNewsletterToken,
  isValidNewsletterEmail,
  mayReceiveNewsletter,
  newsletterConfirmationContent,
  readNewsletterToken,
  subscribeToNewsletter,
  unsubscribeNewsletter,
  type NewsletterStore,
  type NewsletterSubscriber,
} from "./subscription";

const SECRET = "test-newsletter-secret-value";
const NOW = 1_700_000_000;

function memoryStore(initial: NewsletterSubscriber | null = null): NewsletterStore & { row: NewsletterSubscriber | null; saves: number } {
  const state: { row: NewsletterSubscriber | null; saves: number } = { row: initial, saves: 0 };
  return {
    get row() { return state.row; },
    get saves() { return state.saves; },
    async findByEmail() { return state.row; },
    async save(row) {
      state.saves += 1;
      state.row = {
        email_normalized: row.email_normalized,
        status: row.status,
        confirm_token_hash: row.confirm_token_hash,
        unsubscribe_token_hash: row.unsubscribe_token_hash,
      };
      return { ok: true };
    },
  };
}

describe("newsletter subscription", () => {
  it("rejects an invalid address before saving or sending", async () => {
    assert.equal(isValidNewsletterEmail("not-an-email"), false);
    const store = memoryStore();
    let sent = 0;
    const result = await subscribeToNewsletter({
      email: "not-an-email",
      store,
      send: async () => { sent += 1; return { ok: true }; },
      secret: SECRET,
      rateAllowed: true,
      nowSec: NOW,
      appBaseUrl: "https://www.jimvio.com",
    });
    assert.equal(result.status, "invalid_email");
    assert.equal(sent, 0);
    assert.equal(store.saves, 0);
  });

  it("stores a pending subscriber and sends one confirmation", async () => {
    const store = memoryStore();
    const sent: string[] = [];
    const result = await subscribeToNewsletter({
      email: "Reader@Example.com",
      store,
      send: async (message) => { sent.push(message.to); return { ok: true }; },
      secret: SECRET,
      rateAllowed: true,
      nowSec: NOW,
      appBaseUrl: "https://www.jimvio.com",
    });
    assert.equal(result.status, "confirmation_sent");
    assert.deepEqual(sent, ["reader@example.com"]);
    assert.equal(store.row?.status, "pending");
    assert.equal(mayReceiveNewsletter(store.row), false);
    const message = newsletterConfirmationContent({
      confirmUrl: "https://www.jimvio.com/newsletter/confirm?token=abc",
      unsubscribeUrl: "https://www.jimvio.com/newsletter/unsubscribe?token=def",
      assetBaseUrl: "https://www.jimvio.com",
    });
    assert.match(message.text, /not subscribed until/i);
    assert.equal(message.html.includes("javascript:"), false);
  });

  it("does not send again when the address is already confirmed", async () => {
    const store = memoryStore({
      email_normalized: "reader@example.com",
      status: "confirmed",
      confirm_token_hash: null,
      unsubscribe_token_hash: "hash",
    });
    let sent = 0;
    const result = await subscribeToNewsletter({
      email: "reader@example.com",
      store,
      send: async () => { sent += 1; return { ok: true }; },
      secret: SECRET,
      rateAllowed: true,
      nowSec: NOW,
      appBaseUrl: "https://www.jimvio.com",
    });
    assert.equal(result.status, "already_subscribed");
    assert.equal(sent, 0);
    assert.equal(mayReceiveNewsletter(store.row), true);
  });

  it("reports provider and database failures without calling the address subscribed", async () => {
    const failingSend = memoryStore();
    const delivery = await subscribeToNewsletter({
      email: "reader@example.com",
      store: failingSend,
      send: async () => ({ ok: false }),
      secret: SECRET,
      rateAllowed: true,
      nowSec: NOW,
      appBaseUrl: "https://www.jimvio.com",
    });
    assert.equal(delivery.status, "delivery_failed");
    assert.equal(mayReceiveNewsletter(failingSend.row), false);

    const broken: NewsletterStore = {
      async findByEmail() { return null; },
      async save() { return { ok: false }; },
    };
    const database = await subscribeToNewsletter({
      email: "reader@example.com",
      store: broken,
      send: async () => ({ ok: true }),
      secret: SECRET,
      rateAllowed: true,
      nowSec: NOW,
      appBaseUrl: "https://www.jimvio.com",
    });
    assert.equal(database.status, "database_error");
  });

  it("rate limits and refuses to run without a server secret", async () => {
    const store = memoryStore();
    const limited = await subscribeToNewsletter({
      email: "reader@example.com",
      store,
      send: async () => ({ ok: true }),
      secret: SECRET,
      rateAllowed: false,
      nowSec: NOW,
      appBaseUrl: "https://www.jimvio.com",
    });
    assert.equal(limited.status, "rate_limited");
    assert.equal(store.saves, 0);
    const missing = await subscribeToNewsletter({
      email: "reader@example.com",
      store,
      send: async () => ({ ok: true }),
      secret: null,
      rateAllowed: true,
      nowSec: NOW,
      appBaseUrl: "https://www.jimvio.com",
    });
    assert.equal(missing.status, "not_configured");
  });

  it("confirms once and then honors unsubscribe", async () => {
    const store = memoryStore();
    let confirmToken = "";
    let unsubscribeToken = "";
    await subscribeToNewsletter({
      email: "reader@example.com",
      store,
      send: async (message) => {
        const confirmMatch = message.html.match(/https:\/\/www\.jimvio\.com\/newsletter\/confirm\?token=([^"&\s]+)/);
        const unsubscribeMatch = message.text.match(/https:\/\/www\.jimvio\.com\/newsletter\/unsubscribe\?token=([^\s"&]+)/);
        confirmToken = confirmMatch?.[1] ? decodeURIComponent(confirmMatch[1]) : "";
        unsubscribeToken = unsubscribeMatch?.[1] ? decodeURIComponent(unsubscribeMatch[1]) : "";
        return { ok: true };
      },
      secret: SECRET,
      rateAllowed: true,
      nowSec: NOW,
      appBaseUrl: "https://www.jimvio.com",
    });
    assert.equal(await confirmNewsletter({ token: confirmToken, store, secret: SECRET, nowSec: NOW }), "confirmed");
    assert.equal(mayReceiveNewsletter(store.row), true);
    assert.equal(await confirmNewsletter({ token: confirmToken, store, secret: SECRET, nowSec: NOW }), "invalid");
    assert.equal(await unsubscribeNewsletter({ token: unsubscribeToken, store, secret: SECRET, nowSec: NOW }), "unsubscribed");
    assert.equal(mayReceiveNewsletter(store.row), false);
    assert.equal(await unsubscribeNewsletter({ token: unsubscribeToken, store, secret: SECRET, nowSec: NOW }), "unsubscribed");
  });

  it("keeps subscription acceptance behind the server route and its limiters", () => {
    const route = readFileSync(join(process.cwd(), "app/api/newsletter/subscribe/route.ts"), "utf8");
    const footer = readFileSync(join(process.cwd(), "components/layout/footer.tsx"), "utf8");
    assert.match(route, /newsletter:ip:/);
    assert.match(route, /newsletter:email:/);
    assert.match(route, /hasSupabaseSecretKey/);
    assert.equal(route.includes("RESEND_API_KEY"), false);
    assert.match(footer, /\/api\/newsletter\/subscribe/);
    assert.equal(footer.includes("setState\(\"confirmation_sent\"\)"), false);
    assert.match(footer, /payload\?\.status/);
  });

  it("rejects a tampered or expired token", () => {
    const token = createNewsletterToken({ email: "reader@example.com", purpose: "confirm", secret: SECRET, nowSec: NOW, ttlSec: 10 });
    assert.equal(readNewsletterToken(`${token}x`, SECRET, NOW).ok, false);
    assert.equal(readNewsletterToken(token, "other-secret-value-here", NOW).ok, false);
    const expired = readNewsletterToken(token, SECRET, NOW + 11);
    assert.equal(expired.ok, false);
    if (!expired.ok) assert.equal(expired.reason, "expired");
  });
});
