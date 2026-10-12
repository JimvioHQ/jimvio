import { expect, test, type Page } from "@playwright/test";

/**
 * Jimvio AI retry and regenerate. Failure cases use a mocked chat response
 * so Gemini is not overloaded. A fresh browser context is used, with no
 * stored production session.
 */

function sse(events: string[]) {
  return events.map((event) => `data: ${event}\n\n`).join("");
}

async function openFreshChat(page: Page) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  (page as Page & { pageErrors?: string[] }).pageErrors = pageErrors;
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto("/ai");
  await expect(page.getByRole("heading", { name: /How can I help you on/i })).toBeVisible();
}

async function ask(page: Page, text: string) {
  const box = page.getByRole("textbox", { name: "Message Jimvio AI" });
  await box.fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
}

test("keeps a long thread scrollable without horizontal overflow", async ({ page }) => {
  const messages = Array.from({ length: 16 }, (_, index) => ({
    id: `seed-${index}`,
    role: index % 2 === 0 ? "user" : "ai",
    content: index % 2 === 0 ? `Question ${index} about /orders` : `Answer ${index} uses /orders and /wallet.`,
    fallback: false,
  }));
  await page.addInitScript((seed) => {
    window.sessionStorage.setItem("jimvio_copilot_session_v1", JSON.stringify(seed));
  }, messages);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/ai");
  await expect(page.getByText("Question 14 about /orders")).toBeVisible();
  const scroller = page.locator(".overflow-y-auto").first();
  await scroller.evaluate((node) => {
    node.scrollTop = 0;
  });
  await expect(page.getByText("Question 0 about /orders")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});

test.describe("Jimvio AI retry and regenerate", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("retries a guide, then regenerates a live answer without duplicating the question", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/ai/chat", async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "text/event-stream", "x-jimvio-ai-mode": "guide" },
          body: sse([
            JSON.stringify({ jimvio: { mode: "guide" } }),
            JSON.stringify({
              choices: [
                {
                  delta: {
                    content:
                      "Jimvio guide. This is not a live answer.\n\nBuyers review orders at /orders.",
                  },
                },
              ],
            }),
            "[DONE]",
          ]),
        });
        return;
      }
      const chunks = ["Sellers", " manage listings at ", "/seller/products."];
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "x-jimvio-ai-mode": "live",
          "x-jimvio-ai-model": "gemini-flash-latest",
        },
        body: sse([
          JSON.stringify({ jimvio: { mode: "live" } }),
          ...chunks.map((content) => JSON.stringify({ choices: [{ delta: { content } }] })),
          "[DONE]",
        ]),
      });
    });

    await openFreshChat(page);
    await ask(page, "Where do sellers manage products?");
    const retry = page.getByRole("button", { name: "Retry this answer" });
    await expect(retry).toBeVisible();
    await retry.focus();
    await expect(retry).toBeFocused();
    await expect(page.getByText("Jimvio guide. This is not a live answer.")).toBeVisible();
    await expect(page.getByText("/orders")).toBeVisible();

    await retry.click();
    const regenerate = page.getByRole("button", { name: "Regenerate this answer" });
    await expect(regenerate).toBeVisible();
    await expect(page.getByText("/seller/products.")).toBeVisible();
    await expect(page.getByText("Where do sellers manage products?", { exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Retry this answer|Regenerate this answer/ })).toHaveCount(1);

    await regenerate.click();
    await expect(regenerate).toBeVisible();
    await expect(page.getByText("Where do sellers manage products?", { exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Regenerate this answer" })).toHaveCount(1);
    expect(calls).toBe(3);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
    expect((page as Page & { pageErrors?: string[] }).pageErrors ?? []).toEqual([]);
  });

  test("recovers from rate limiting, an empty stream, and a dropped connection", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/ai/chat", async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ error: "rate limit" }),
        });
        return;
      }
      if (calls === 2) {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "text/event-stream", "x-jimvio-ai-mode": "live" },
          body: sse([JSON.stringify({ jimvio: { mode: "live" } }), "[DONE]"]),
        });
        return;
      }
      if (calls === 3) {
        await route.abort("failed");
        return;
      }
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "x-jimvio-ai-mode": "live",
          "x-jimvio-ai-model": "gemini-flash-latest",
        },
        body: sse([
          JSON.stringify({ jimvio: { mode: "live" } }),
          JSON.stringify({ choices: [{ delta: { content: "Open /orders for the status already shown." } }] }),
          "[DONE]",
        ]),
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openFreshChat(page);
    await ask(page, "Where can I view my orders?");
    await expect(page.getByText("Jimvio AI couldn't generate a response right now. Please try again.")).toBeVisible();
    const retry = page.getByRole("button", { name: "Retry this answer" });
    await retry.click();
    await expect(page.getByText("Jimvio AI couldn't generate a response right now. Please try again.")).toBeVisible();
    await retry.click();
    await expect(page.getByText("Jimvio AI couldn't generate a response right now. Please try again.")).toBeVisible();
    await retry.click();
    await expect(page.getByText("Open /orders for the status already shown.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Regenerate this answer" })).toBeVisible();
    await expect(page.getByText("Where can I view my orders?", { exact: true })).toHaveCount(1);
    expect(calls).toBe(4);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  });

  test("ignores a repeated retry click and keeps a stopped reply after leaving the page", async ({ page }) => {
    let calls = 0;
    let releaseLate = () => {};
    const holdLate = new Promise<void>((resolve) => {
      releaseLate = resolve;
    });
    await page.route("**/api/ai/chat", async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "text/event-stream", "x-jimvio-ai-mode": "guide" },
          body: sse([
            JSON.stringify({ jimvio: { mode: "guide" } }),
            JSON.stringify({
              choices: [{ delta: { content: "Jimvio guide. This is not a live answer.\n\nOpen /wallet." } }],
            }),
            "[DONE]",
          ]),
        });
        return;
      }
      await holdLate;
      try {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "text/event-stream", "x-jimvio-ai-mode": "live" },
          body: sse([
            JSON.stringify({ jimvio: { mode: "live" } }),
            JSON.stringify({ choices: [{ delta: { content: "Late answer that should not duplicate." } }] }),
            "[DONE]",
          ]),
        });
      } catch {
        // The page navigated away and aborted this request.
      }
    });

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      if (window.sessionStorage.getItem("jimvio_e2e_keep") === "1") return;
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.sessionStorage.setItem("jimvio_e2e_keep", "1");
    });
    await page.goto("/ai");
    await expect(page.getByRole("heading", { name: /How can I help you on/i })).toBeVisible();
    await ask(page, "Where is my wallet?");
    await page.getByRole("button", { name: "Retry this answer" }).evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect(page.getByRole("button", { name: "Retry this answer" })).toHaveCount(0);
    await page.goto("/marketplace", { waitUntil: "commit" });
    await page.waitForURL("**/marketplace/**");
    releaseLate();
    await page.goto("/ai");
    await expect(page.getByText("Where is my wallet?", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Late answer that should not duplicate.")).toHaveCount(0);
    await expect(page.getByText("Jimvio AI is typing")).toHaveCount(0);
    expect(calls).toBe(2);
    expect(pageErrors).toEqual([]);
  });

  test("treats a provider error after partial text as an unfinished reply", async ({ page }) => {
    await page.route("**/api/ai/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-jimvio-ai-mode": "live" },
        body: sse([
          JSON.stringify({ jimvio: { mode: "live" } }),
          JSON.stringify({ choices: [{ delta: { content: "Partial orders note" } }] }),
          JSON.stringify({ jimvio: { error: "unavailable" } }),
        ]),
      });
    });
    await openFreshChat(page);
    await ask(page, "How do I check an order?");
    await expect(page.getByText("Partial orders note")).toBeVisible();
    await expect(page.getByText("Jimvio AI couldn't finish this response. Please try again.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry this answer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Regenerate this answer" })).toHaveCount(0);
  });

  test("disables regenerate while another reply is loading and keeps earlier messages after a failure", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/ai/chat", async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "text/event-stream", "x-jimvio-ai-mode": "live" },
          body: sse([
            JSON.stringify({ jimvio: { mode: "live" } }),
            JSON.stringify({ choices: [{ delta: { content: "Open /wallet for the balance already shown." } }] }),
            "[DONE]",
          ]),
        });
        return;
      }
      if (calls === 2) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "high demand" }),
        });
        return;
      }
      await route.abort();
    });

    await openFreshChat(page);
    await ask(page, "Where can I view my wallet?");
    const regenerate = page.getByRole("button", { name: "Regenerate this answer" });
    await expect(regenerate).toBeEnabled();
    await ask(page, "Where can I view my orders?");
    await expect(regenerate).toBeDisabled();
    await expect(page.getByText("Jimvio AI couldn't generate a response right now. Please try again.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Open /wallet for the balance already shown.")).toBeVisible();
    await expect(page.getByText("Where can I view my wallet?", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Where can I view my orders?", { exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Retry this answer" })).toBeVisible();

    await regenerate.click();
    await expect(page.getByText("Open /wallet for the balance already shown.")).toBeVisible();
    await expect(page.getByText("Where can I view my wallet?", { exact: true })).toHaveCount(1);
    expect(calls).toBe(3);
  });

  test("stops the typing indicator when the stream breaks", async ({ page }) => {
    await page.route("**/api/ai/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-jimvio-ai-mode": "live" },
        body: `data: ${JSON.stringify({ jimvio: { mode: "live" } })}\n\ndata: ${JSON.stringify({ choices: [{ delta: { content: "Partial" } }] })}\n\n`,
      });
    });
    await openFreshChat(page);
    await ask(page, "How do I check shipping?");
    await expect(page.getByText("Partial")).toBeVisible();
    await expect(page.getByText("Jimvio AI is typing")).toHaveCount(0);
    await expect(page.getByText("Jimvio AI couldn't finish this response. Please try again.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry this answer" })).toBeVisible();
  });
});
