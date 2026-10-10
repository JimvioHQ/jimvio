import { expect, test, type BrowserContext } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CUSTOMER_STORAGE,
  MERCHANT_STORAGE,
  designatedStorage,
  isFixtureId,
  mutationsEnabled,
  paymentsEnabled,
  readOnlyDiagnostics,
  readOnlySignedIn,
  storefrontUrl,
} from "../scripts/commerce-e2e-gates.mjs";

/**
 * Commerce OS coverage. Guest production probes, signed-in reads, mutations,
 * and payment initialization are separate opt-ins. See .env.example.
 * This file never prints secrets or creates accounts by itself.
 */

const PROD = "https://www.jimvio.com";
const probeProduction = process.env.COMMERCE_E2E_PROBE_PRODUCTION === "1";
const gateEnv = {
  allow: process.env.COMMERCE_E2E_ALLOW,
  mutate: process.env.COMMERCE_E2E_MUTATE,
  paymentSandbox: process.env.COMMERCE_E2E_PAYMENT_SANDBOX,
  sandboxConfirmed: process.env.COMMERCE_E2E_SANDBOX_CONFIRMED,
  productionTarget: process.env.COMMERCE_E2E_PRODUCTION_TARGET,
  base: process.env.COMMERCE_E2E_BASE_URL || "http://localhost:3000",
};
const allow = readOnlySignedIn(gateEnv);
const mutate = mutationsEnabled(gateEnv);
const paymentSandbox = paymentsEnabled(gateEnv);
const base = gateEnv.base.replace(/\/$/, "");
const merchantStorage = designatedStorage(process.env.COMMERCE_E2E_MERCHANT_STORAGE || MERCHANT_STORAGE, "merchant");
const customerStorage = designatedStorage(process.env.COMMERCE_E2E_CUSTOMER_STORAGE || CUSTOMER_STORAGE, "customer");
const storeId = process.env.COMMERCE_E2E_STORE_ID || "";
const storeHandle = process.env.COMMERCE_E2E_STORE_HANDLE || "";
const marketplaceProductId = process.env.COMMERCE_E2E_MARKETPLACE_PRODUCT_ID || "";
const supplierProductId = process.env.COMMERCE_E2E_SUPPLIER_PRODUCT_ID || "";
const pageId = process.env.COMMERCE_E2E_PAGE_ID || "";
const unpaidOrderId = process.env.COMMERCE_E2E_UNPAID_ORDER_ID || "";
const storefront = storefrontUrl(base, storeHandle, gateEnv.productionTarget);

function merchantReady() {
  return allow && merchantStorage.ok && existsSync(merchantStorage.path);
}

function customerReady() {
  return allow && customerStorage.ok && existsSync(customerStorage.path) && Boolean(storeHandle);
}

async function merchantContext(browser: { newContext: (opts: object) => Promise<BrowserContext> }) {
  return browser.newContext({ storageState: merchantStorage.path, baseURL: base });
}

test.describe("commerce invariants", () => {
  test("supplier inventory rejection stays enforced when mutation tests are off", () => {
    const route = readFileSync(join(process.cwd(), "app/api/commerce/inventory/route.ts"), "utf8");
    expect(route).toContain("merchantCanAdjustStock");
    expect(route).toContain("status: 403");
  });
});

test.describe("commerce guest gates", () => {
  test.skip(!probeProduction, "Set COMMERCE_E2E_PROBE_PRODUCTION=1 to call production guest routes");
  test.use({ storageState: { cookies: [], origins: [] } });
  test("merchant commerce redirects guests to login", async ({ request }) => {
    const res = await request.get(`${PROD}/commerce`, { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers().location || "").toContain("/login");
  });

  test("store cart and checkout require a customer session", async ({ request }) => {
    const cart = await request.get("https://p7-provider-store.jimvio.com/cart", { maxRedirects: 0 });
    const checkout = await request.get("https://p7-provider-store.jimvio.com/checkout", { maxRedirects: 0 });
    expect(cart.status()).toBe(307);
    expect(checkout.status()).toBe(307);
    expect(cart.headers().location || "").toContain("/login");
    expect(checkout.headers().location || "").toContain("/login");
  });

  test("unauthenticated commerce writes are rejected", async ({ request }) => {
    const store = await request.post(`${PROD}/api/commerce/stores`, { data: { name: "e2e-blocked" } });
    const inventory = await request.post(`${PROD}/api/commerce/inventory`, {
      data: { storeId: "00000000-0000-0000-0000-000000000000", productId: "00000000-0000-0000-0000-000000000000", delta: 1 },
    });
    expect(store.status()).toBe(401);
    expect(inventory.status()).toBe(401);
  });

  test("unsigned payment webhooks do not confirm payment", async ({ request }) => {
    const now = await request.post(`${PROD}/api/webhooks/nowpayments`, {
      data: { payment_status: "finished", order_id: "00000000-0000-0000-0000-000000000000" },
      headers: { "x-nowpayments-sig": "invalid" },
    });
    const flutter = await request.post(`${PROD}/api/payments/flutterwave/webhook`, {
      data: { event: "charge.completed", data: { status: "successful", tx_ref: "e2e-invalid" } },
      headers: { "verif-hash": "invalid" },
    });
    const nowBody = (await now.text()).toLowerCase();
    const flutterBody = (await flutter.text()).toLowerCase();
    expect(now.status()).toBe(401);
    expect([401, 500]).toContain(flutter.status());
    if (flutter.status() === 500) {
      expect(flutterBody).toContain("misconfiguration");
    }
    expect(nowBody).not.toContain("paid");
    expect(flutterBody).not.toContain("paid");
  });
});

test.describe("commerce signed-in workflows", () => {
  test.skip(
    !allow,
    readOnlyDiagnostics(gateEnv, {
      merchant: merchantStorage.ok && existsSync(merchantStorage.path),
      customer: customerStorage.ok && existsSync(customerStorage.path),
    }).join("; ") || "Signed-in commerce checks are closed",
  );
  test("merchant session can open stores", async ({ browser }) => {
    test.skip(!merchantReady(), "Need COMMERCE_E2E_ALLOW=1 and COMMERCE_E2E_MERCHANT_STORAGE");
    const context = await merchantContext(browser);
    const page = await context.newPage();
    await page.goto(`${base}/commerce/stores`);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Your Stores" })).toBeVisible();
    await context.close();
  });

  test("new store uses the provider template", async ({ browser }) => {
    test.skip(!mutate, "Need COMMERCE_E2E_MUTATE=1 before creating a store");
    test.skip(!merchantReady(), "Need a merchant storage state");
    const context = await merchantContext(browser);
    const page = await context.newPage();
    const handle = `e2e-${Date.now().toString(36)}`;
    await page.goto(`${base}/commerce/stores`);
    const opener = page.getByRole("button", { name: "Create Store" });
    if (await opener.count()) await opener.click();
    await page.getByPlaceholder("My brand").fill(`E2E ${handle}`);
    await page.getByPlaceholder("my-brand").fill(handle);
    await page.getByRole("button", { name: "Create Your Store" }).click();
    await expect(page).toHaveURL(/\/commerce\/builder\?storeId=/);
    await context.close();
  });

  test("template draft can be saved and published", async ({ browser }) => {
    test.skip(!mutate || !merchantReady() || !isFixtureId(storeId), "Need mutate flag, merchant session, and COMMERCE_E2E_STORE_ID");
    const context = await merchantContext(browser);
    const page = await context.newPage();
    const current = await page.request.get(`${base}/api/commerce/builder?storeId=${storeId}`);
    expect(current.ok()).toBeTruthy();
    const json = await current.json();
    const draft = json.theme_draft;
    expect(draft && typeof draft === "object").toBeTruthy();
    const saved = await page.request.patch(`${base}/api/commerce/builder`, {
      data: { storeId, theme_draft: draft },
    });
    expect(saved.ok()).toBeTruthy();
    const published = await page.request.post(`${base}/api/commerce/builder`, {
      data: { storeId, action: "publish" },
    });
    expect(published.ok()).toBeTruthy();
    if (storeHandle) {
      const live = await page.request.get(`${storefront}/`);
      expect(live.ok()).toBeTruthy();
    }
    await context.close();
  });

  test("marketplace import stays on the test store", async ({ browser }) => {
    test.skip(
      !mutate || !merchantReady() || !isFixtureId(storeId) || !isFixtureId(marketplaceProductId),
      "Need COMMERCE_E2E_MARKETPLACE_PRODUCT_ID for an isolated import",
    );
    const context = await merchantContext(browser);
    const page = await context.newPage();
    const res = await page.request.post(`${base}/api/commerce/products/marketplace`, {
      data: { storeId, productId: marketplaceProductId },
    });
    expect([201, 409]).toContain(res.status());
    await context.close();
  });

  test("product edit changes presentation fields only", async ({ browser }) => {
    test.skip(
      !mutate || !merchantReady() || !isFixtureId(storeId) || !isFixtureId(marketplaceProductId),
      "Need an isolated product id before editing",
    );
    const context = await merchantContext(browser);
    const page = await context.newPage();
    const res = await page.request.patch(`${base}/api/commerce/products/${marketplaceProductId}`, {
      data: {
        storeId,
        name: `E2E product ${Date.now()}`,
        description: "Isolated commerce E2E description.",
        price: 19,
      },
    });
    expect(res.ok()).toBeTruthy();
    await context.close();
  });

  test("supplier stock adjustment is rejected", async ({ browser }) => {
    test.skip(
      !mutate || !merchantReady() || !isFixtureId(storeId) || !isFixtureId(supplierProductId),
      "Inventory writes stay off until COMMERCE_E2E_MUTATE=1 and COMMERCE_E2E_SUPPLIER_PRODUCT_ID is set",
    );
    const context = await merchantContext(browser);
    const page = await context.newPage();
    const res = await page.request.post(`${base}/api/commerce/inventory`, {
      data: { storeId, productId: supplierProductId, delta: 1, reason: "manual" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
    await context.close();
  });

  test("content page can be drafted and published", async ({ browser }) => {
    test.skip(!mutate || !merchantReady() || !isFixtureId(storeId) || !isFixtureId(pageId), "Need COMMERCE_E2E_PAGE_ID");
    const context = await merchantContext(browser);
    const page = await context.newPage();
    const draft = await page.request.patch(`${base}/api/commerce/pages`, {
      data: {
        storeId,
        pageId,
        title: "E2E policy",
        body_html: "<p>Isolated commerce E2E page.</p>",
        published: false,
      },
    });
    expect(draft.ok()).toBeTruthy();
    const published = await page.request.patch(`${base}/api/commerce/pages`, {
      data: { storeId, pageId, published: true },
    });
    expect(published.ok()).toBeTruthy();
    await context.close();
  });

  test("shipping zone is created from the server rate and then removed", async ({ browser }) => {
    test.skip(!mutate || !merchantReady() || !isFixtureId(storeId), "Need COMMERCE_E2E_MUTATE=1, merchant session, and COMMERCE_E2E_STORE_ID");
    const context = await merchantContext(browser);
    const page = await context.newPage();
    const created = await page.request.post(`${base}/api/commerce/shipping`, {
      data: {
        storeId,
        name: `E2E zone ${Date.now()}`,
        countries: ["ZZ"],
        rate: { name: "E2E rate", rate_type: "flat", price: 5, currency: "USD", clientTotal: 0 },
      },
    });
    expect(created.status()).toBe(201);
    const body = await created.json();
    expect(body.rate?.price).toBe(5);
    const zoneId = body.zone?.id;
    expect(zoneId).toBeTruthy();
    const removed = await page.request.delete(
      `${base}/api/commerce/shipping?storeId=${storeId}&zoneId=${zoneId}`,
    );
    expect(removed.ok()).toBeTruthy();
    await context.close();
  });

  test("customer checkout persists an order before payment", async ({ browser }) => {
    test.skip(
      !paymentSandbox || !customerReady() || !isFixtureId(marketplaceProductId),
      "Need mutation, COMMERCE_E2E_PAYMENT_SANDBOX=1, COMMERCE_E2E_SANDBOX_CONFIRMED=1, and an isolated product UUID",
    );
    const context = await browser.newContext({ storageState: customerStorage.path, baseURL: storefront });
    const page = await context.newPage();
    await page.goto(`${storefront}/`);
    await page.getByRole("button", { name: "Add to Cart" }).first().click();
    await page.goto(`${storefront}/checkout`);
    await expect(page).not.toHaveURL(/order_not_found/);
    await expect(page).not.toHaveURL(/\/login/);
    await context.close();
  });

  test("continue payment opens an existing unpaid test order", async ({ browser }) => {
    test.skip(
      !paymentSandbox || !customerReady() || !isFixtureId(unpaidOrderId),
      "Need the payment sandbox flags and a disposable unpaid order UUID",
    );
    const context = await browser.newContext({ storageState: customerStorage.path });
    const page = await context.newPage();
    await page.goto(`${storefront}/checkout?order_id=${unpaidOrderId}`);
    await expect(page).not.toHaveURL(/order_not_found/);
    await expect(page).not.toHaveURL(/\/login/);
    await context.close();
  });

  test("customer can view tracking state for the unpaid order", async ({ browser }) => {
    test.skip(!customerReady() || !isFixtureId(unpaidOrderId), "Need a disposable unpaid order UUID");
    const context = await browser.newContext({ storageState: customerStorage.path });
    const page = await context.newPage();
    await page.goto(`${storefront}/account/orders/${unpaidOrderId}`);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/Waiting for payment|Tracking not available yet/)).toBeVisible();
    await context.close();
  });

  test("another customer's order id is rejected", async ({ browser }) => {
    test.skip(!customerReady(), "Need a customer storage state");
    const context = await browser.newContext({ storageState: customerStorage.path });
    const page = await context.newPage();
    const foreign = "00000000-0000-0000-0000-000000000000";
    await page.goto(`${storefront}/checkout?order_id=${foreign}`);
    await expect(page).toHaveURL(/login|order_not_found|cart/);
    const commerce = await page.request.get(`${base}/commerce/orders`, { maxRedirects: 0 });
    expect(commerce.status()).toBe(307);
    await context.close();
  });
});
