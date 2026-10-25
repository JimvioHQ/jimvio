import { expect, test, type Page } from "@playwright/test";

/**
 * Real /ai page. Chat and action calls are mocked in the browser so streaming,
 * layout, and failure copy are deterministic. Set LIVE_AI_CARDS=1 to also ask
 * production AI for catalog cards.
 */

type MockChat = { events: string[]; status?: number; delayMs?: number };

function sseEvent(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

async function installFetchControl(page: Page) {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const mock = (window as unknown as { __jimvioMockChat?: MockChat }).__jimvioMockChat;
      if (mock && url.includes("/api/ai/chat")) {
        if (mock.status && mock.status >= 400) {
          return new Response(JSON.stringify({ error: "unavailable" }), { status: mock.status });
        }
        const encoder = new TextEncoder();
        const events = mock.events;
        const delayMs = mock.delayMs ?? 0;
        const stream = new ReadableStream({
          async start(controller) {
            for (const event of events) {
              if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
              controller.enqueue(encoder.encode(event));
            }
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { "content-type": "text/event-stream", "x-jimvio-ai-mode": "live" },
        });
      }
      const action = (window as unknown as { __jimvioMockAction?: { status: number; body: unknown } }).__jimvioMockAction;
      if (action && url.includes("/api/ai/actions")) {
        return new Response(JSON.stringify(action.body), {
          status: action.status,
          headers: { "content-type": "application/json" },
        });
      }
      return original(input, init);
    };
  });
}

async function openFreshChat(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto("/ai");
  await expect(page.getByRole("heading", { name: /How can I help you on/i })).toBeVisible();
}

async function setMock(page: Page, mock: MockChat) {
  await page.evaluate((value) => {
    (window as unknown as { __jimvioMockChat?: MockChat }).__jimvioMockChat = value;
  }, mock);
}

async function ask(page: Page, text: string) {
  const box = page.getByRole("textbox", { name: "Message Jimvio AI" });
  await box.fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
}

test.describe("Jimvio AI chat experience", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await installFetchControl(page);
  });

  test("shows a preparing state, streams the caret, then finishes", async ({ page }) => {
    await openFreshChat(page);
    await setMock(page, {
      delayMs: 350,
      events: [
        sseEvent({ jimvio: { mode: "live" } }),
        sseEvent({ choices: [{ delta: { content: "Reset it from " } }] }),
        sseEvent({ choices: [{ delta: { content: "Forgot Password." } }] }),
        "data: [DONE]\n\n",
      ],
    });
    await ask(page, "How do I reset my password?");
    await expect(page.getByRole("status").filter({ hasText: "Jimvio AI is preparing an answer" })).toBeVisible();
    const caret = page.locator("span.animate-pulse");
    await expect(caret).toBeVisible();
    await expect(page.getByText("Forgot Password.")).toBeVisible();
    await expect(caret).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Regenerate this answer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  test("does not pull the reader away from older messages", async ({ page }) => {
    const messages = Array.from({ length: 24 }, (_, index) => ({
      id: `seed-${index}`,
      role: index % 2 === 0 ? "user" : "ai",
      content:
        index % 2 === 0
          ? `Older question ${index} ${"about selling on Jimvio ".repeat(12)}`
          : `Older answer ${index} stays put. ${"Keep this paragraph in view. ".repeat(14)}`,
      fallback: false,
    }));
    await page.addInitScript((seed) => {
      window.sessionStorage.setItem("jimvio_copilot_session_v1", JSON.stringify(seed));
    }, messages);
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto("/ai");
    const scroller = page.locator(".overflow-y-auto").filter({ hasText: "Older question 0" }).last();
    await expect(scroller.getByText("Older question 22", { exact: false }).first()).toBeVisible();
    await scroller.evaluate((node) => {
      node.scrollTop = 0;
    });
    await expect(scroller.getByText("Older question 0", { exact: false }).first()).toBeVisible();
    const before = await scroller.evaluate((node) => ({
      top: node.scrollTop,
      overflow: node.scrollHeight > node.clientHeight + 80,
    }));
    expect(before.overflow).toBe(true);
    expect(before.top).toBeLessThan(40);
    await setMock(page, {
      delayMs: 200,
      events: [
        sseEvent({ jimvio: { mode: "live" } }),
        sseEvent({ choices: [{ delta: { content: "A short new answer." } }] }),
        "data: [DONE]\n\n",
      ],
    });
    await ask(page, "A new question while I read the top");
    await page.waitForTimeout(250);
    const atTop = await scroller.evaluate((node) => node.scrollTop < 40);
    expect(atTop).toBe(true);
    await expect(page.getByText("A short new answer.")).toBeVisible();
  });

  test("renders product and community cards that link to real records", async ({ page }) => {
    await page.route("**/api/products**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{
            id: "prod-1",
            name: "Checked Phone Case",
            slug: "checked-phone-case",
            price: 19,
            currency: "USD",
            images: ["https://www.jimvio.com/favicon.ico"],
            view_count: 12,
            status: "active",
          }],
        }),
      });
    });
    await page.route("**/api/communities**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          communities: [{
            id: "com-1",
            name: "Checked Design Hub",
            slug: "checked-design-hub",
            is_private: false,
            visibility: "public",
            member_count: 5,
            post_count: 8,
            tagline: "Public design talk",
          }],
        }),
      });
    });
    await openFreshChat(page);
    await setMock(page, {
      events: [
        sseEvent({ jimvio: { mode: "live" } }),
        sseEvent({ choices: [{ delta: { content: "Here are public catalog results." } }] }),
        "data: [DONE]\n\n",
      ],
    });
    await ask(page, "Show me trending products.");
    const product = page.getByRole("link", { name: /Checked Phone Case/ });
    await expect(product).toBeVisible();
    await expect(product).toHaveAttribute("href", "/marketplace/checked-phone-case");
    await expect(page.getByText("Catalog result", { exact: true })).toBeVisible();
    await expect(page.getByText(/Stored view count: 12/)).toBeVisible();

    await setMock(page, {
      events: [
        sseEvent({ jimvio: { mode: "live" } }),
        sseEvent({ choices: [{ delta: { content: "Here are public communities." } }] }),
        "data: [DONE]\n\n",
      ],
    });
    await ask(page, "What is trending in the community?");
    const community = page.getByRole("link", { name: /Checked Design Hub/ });
    await expect(community).toBeVisible();
    await expect(community).toHaveAttribute("href", "/communities/checked-design-hub");
    await expect(page.getByText(/Stored post count: 8/)).toBeVisible();
  });

  test("renders public post cards and states the room limit", async ({ page }) => {
    await page.route("**/api/posts/feed**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          posts: [{
            id: "post-1",
            title: "Checked phone post",
            audience: "public",
            like_count: 3,
            comment_count: 1,
            author_id: "hidden-author",
            communities: { slug: "design", name: "Design", is_private: false, visibility: "public" },
          }],
        }),
      });
    });
    await openFreshChat(page);
    await setMock(page, {
      events: [
        sseEvent({ jimvio: { mode: "live" } }),
        sseEvent({ choices: [{ delta: { content: "I looked through the public feed." } }] }),
        "data: [DONE]\n\n",
      ],
    });
    await ask(page, "Find posts about phones");
    await expect(page.getByText(/Private rooms are not included/).first()).toBeVisible();
    const post = page.getByRole("link", { name: /Checked phone post/ });
    await expect(post).toBeVisible();
    await expect(post).toHaveAttribute("href", "/communities/design/feed?post=post-1");
    await expect(page.getByText("hidden-author")).toHaveCount(0);
    await expect(page.getByText(/Stored like count: 3/)).toBeVisible();
  });

  test("keeps cards inside a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/products**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: "prod-1", name: "Narrow Phone Case", slug: "narrow-phone-case", price: 10, currency: "USD", view_count: 2 },
            { id: "prod-2", name: "Narrow Charger", slug: "narrow-charger", price: 15, currency: "USD", view_count: 4 },
          ],
        }),
      });
    });
    await openFreshChat(page);
    await setMock(page, {
      events: [
        sseEvent({ jimvio: { mode: "live" } }),
        sseEvent({ choices: [{ delta: { content: "Two catalog results." } }] }),
        "data: [DONE]\n\n",
      ],
    });
    await ask(page, "Show me trending products.");
    const first = page.getByRole("link", { name: /Narrow Phone Case/ });
    const second = page.getByRole("link", { name: /Narrow Charger/ });
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();
    const boxes = await Promise.all([first.boundingBox(), second.boundingBox()]);
    expect(boxes[0]?.width).toBeLessThanOrEqual(390);
    expect(boxes[1]?.width).toBeLessThanOrEqual(390);
    expect((boxes[0]?.y ?? 0) < (boxes[1]?.y ?? 0)).toBe(true);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    expect(overflow).toBe(true);
  });

  test("respects reduced motion on the preparing indicator", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openFreshChat(page);
    await setMock(page, {
      delayMs: 800,
      events: [
        sseEvent({ jimvio: { mode: "live" } }),
        sseEvent({ choices: [{ delta: { content: "Done." } }] }),
        "data: [DONE]\n\n",
      ],
    });
    await ask(page, "How do I reset my password?");
    const dot = page.getByRole("status").locator("span").first();
    await expect(dot).toBeVisible();
    const animation = await dot.evaluate((node) => getComputedStyle(node).animationName);
    expect(animation).toBe("none");
  });

  test("shows a retry after failure and ignores a second send", async ({ page }) => {
    await openFreshChat(page);
    await setMock(page, { status: 503, events: [] });
    await ask(page, "Where do sellers manage products?");
    await expect(page.getByText("Jimvio AI couldn't generate a response right now. Please try again.")).toBeVisible();
    const retry = page.getByRole("button", { name: "Retry this answer" });
    await expect(retry).toBeVisible();
    await expect(page.getByText("Where do sellers manage products?", { exact: true })).toHaveCount(1);

    let calls = 0;
    await page.exposeFunction("__countChat", () => {
      calls += 1;
    });
    await page.evaluate(() => {
      const current = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("/api/ai/chat")) void (window as unknown as { __countChat?: () => void }).__countChat?.();
        return current(input, init);
      };
    });
    await setMock(page, {
      delayMs: 700,
      events: [
        sseEvent({ jimvio: { mode: "live" } }),
        sseEvent({ choices: [{ delta: { content: "Sellers use the product form." } }] }),
        "data: [DONE]\n\n",
      ],
    });
    await retry.click();
    await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
    const box = page.getByRole("textbox", { name: "Message Jimvio AI" });
    await box.fill("A second question");
    await page.getByRole("button", { name: "Send message" }).click({ force: true });
    await expect(page.getByText("Sellers use the product form.")).toBeVisible();
    await expect(page.locator("p").filter({ hasText: "A second question" })).toHaveCount(0);
    expect(calls).toBe(1);
  });

  test("does not claim a community or ticket was created without server success", async ({ page }) => {
    await openFreshChat(page);
    await ask(page, "How do I create a support ticket?");
    await expect(page.getByText("This chat has not opened a ticket.")).toBeVisible();
    await expect(page.getByRole("button", { name: "New ticket" })).toBeVisible();

    await ask(page, "Help me create a community called Northstar");
    await expect(page.getByText(/I have not created it yet/)).toBeVisible();
    await page.evaluate(() => {
      (window as unknown as { __jimvioMockAction?: { status: number; body: unknown } }).__jimvioMockAction = {
        status: 401,
        body: { error: "Sign in required" },
      };
    });
    await ask(page, "Yes, create it");
    await expect(page.getByText("Nothing was created.")).toBeVisible();
    await expect(page.getByText(/Created the free public community/)).toHaveCount(0);

    await ask(page, "Help me create a community called Northstar");
    await page.evaluate(() => {
      (window as unknown as { __jimvioMockAction?: { status: number; body: unknown } }).__jimvioMockAction = {
        status: 200,
        body: {
          ok: true,
          community: { slug: "northstar", name: "Northstar" },
          href: "/communities/northstar",
          manageHref: "/owner/communities/northstar",
        },
      };
    });
    await ask(page, "Yes, create it");
    await expect(page.getByText(/Created the free public community “Northstar”/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Open community" })).toBeVisible();
  });
});

test("live production catalog cards use stored counts", async ({ page }) => {
  test.skip(process.env.LIVE_AI_CARDS !== "1", "Set LIVE_AI_CARDS=1 to call the live assistant.");
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto("/ai");
  await expect(page.getByRole("heading", { name: /How can I help you on/i })).toBeVisible();
  const box = page.getByRole("textbox", { name: "Message Jimvio AI" });
  await box.fill("Show me trending products.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Catalog result").first()).toBeVisible({ timeout: 60_000 });
  const productLink = page.locator('a[href^="/marketplace/"]').filter({ hasText: "Catalog result" }).first();
  await expect(productLink).toBeVisible();
  await expect(page.getByText(/Stored view count:/).first()).toBeVisible();
});
