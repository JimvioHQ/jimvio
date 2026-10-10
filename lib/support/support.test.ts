import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SUPPORT_ARTICLES, articlesInCategory, getSupportArticle, relatedArticles } from "./articles";
import { knowledgeAnswer } from "./knowledge-answer";
import { searchSupportArticles } from "./search";
import { SUPPORT_CATEGORIES } from "./types";
import { customerVisibleMessages } from "./format";
import { deliverSupportNotice } from "./notify";
import { canTransition, ticketSearchTerm, validateTicketInput } from "./validation";

const requiredTitles = [
  "How do I create a Jimvio account?",
  "How do I track an order?",
  "How do I request an eligible payout?",
  "How do I generate an affiliate link?",
  "How do I import a product?",
  "How do I start a live session?",
  "What should I do if a download fails?",
  "How do I protect my account?",
  "What AI-powered tools are available on Jimvio?",
  "How do I follow up on an existing ticket?",
];

describe("support knowledge base", () => {
  it("publishes a real answer for every article in every category", () => {
    assert.equal(SUPPORT_CATEGORIES.length, 15);
    assert.equal(SUPPORT_ARTICLES.length, 197);
    const slugs = new Set<string>();
    for (const category of SUPPORT_CATEGORIES) {
      const articles = articlesInCategory(category.id);
      assert.ok(articles.length >= 5, category.id);
    }
    for (const article of SUPPORT_ARTICLES) {
      assert.equal(slugs.has(article.slug), false, article.slug);
      slugs.add(article.slug);
      assert.ok(article.lead.length > 40);
      assert.ok(article.steps.length >= 3);
      assert.ok(article.troubleshooting.length >= 2);
      assert.ok(article.next.length > 20);
      assert.equal(article.lead.endsWith("?"), false);
    }
    for (const title of requiredTitles) {
      assert.ok(SUPPORT_ARTICLES.some((article) => article.title === title), title);
    }
  });

  it("searches case-insensitively and handles empty or unknown queries", () => {
    assert.deepEqual(searchSupportArticles(SUPPORT_ARTICLES, " "), []);
    assert.deepEqual(searchSupportArticles(SUPPORT_ARTICLES, "z"), []);
    const hits = searchSupportArticles(SUPPORT_ARTICLES, "WITHDRAW earnings");
    assert.ok(hits.some((hit) => hit.slug === "request-payout"));
    const scoped = searchSupportArticles(SUPPORT_ARTICLES, "order", { category: "live", limit: 5 });
    assert.ok(scoped.every((hit) => hit.category === "live"));
    const article = getSupportArticle("track-order");
    assert.ok(article);
    assert.ok(relatedArticles(article!).length > 0);
  });

  it("answers from articles and escalates unknown questions", () => {
    const known = knowledgeAnswer(SUPPORT_ARTICLES, "How do I withdraw my earnings?");
    assert.match(known.answer, /wallet/i);
    assert.ok(known.slugs.length > 0);
    const unknown = knowledgeAnswer(SUPPORT_ARTICLES, "quantum pineapple warranty");
    assert.match(unknown.answer, /support ticket/i);
    assert.equal(unknown.slugs.length, 0);
  });
});

describe("support tickets", () => {
  it("validates required fields and rejects secrets", () => {
    const bad = validateTicketInput({
      subject: "Hi",
      category: "payments",
      issueType: "billing",
      description: "too short",
      priority: "normal",
      referenceCode: "",
      name: "",
      email: "",
      idempotencyKey: "",
      company: "",
    });
    assert.equal(bad.ok, false);

    const secret = validateTicketInput({
      subject: "Card problem",
      category: "payments",
      issueType: "billing",
      description: "My card is 4242424242424242 and it failed.",
      priority: "high",
      referenceCode: "",
      name: "",
      email: "person@example.com",
      idempotencyKey: "idempotency1",
      company: "",
    });
    assert.equal(secret.ok, false);

    const good = validateTicketInput({
      subject: "Withdrawal still pending",
      category: "payments",
      issueType: "billing",
      description: "The wallet shows a pending withdrawal. Reference WD-100.",
      priority: "normal",
      referenceCode: "WD-100",
      name: "Amina",
      email: "amina@example.com",
      idempotencyKey: "idempotency1",
      company: "",
    });
    assert.equal(good.ok, true);
    if (good.ok) assert.equal(good.value.referenceCode, "WD-100");
  });

  it("hides internal notes and strips ticket-search syntax", () => {
    const visible = customerVisibleMessages([
      { id: "1", visibility: "internal", author_role: "staff", body: "private", created_at: "2026-01-01" },
      { id: "2", visibility: "customer", author_role: "customer", body: "hello", created_at: "2026-01-02" },
    ]);
    assert.deepEqual(visible, [{ id: "2", authorRole: "customer", body: "hello", createdAt: "2026-01-02" }]);
    assert.equal(ticketSearchTerm("ref),(user_id.eq.other)"), "ref user id.eq.other");
  });

  it("reports email as unsent when the provider is disabled", async () => {
    let called = false;
    const result = await deliverSupportNotice(
      {
        publicRef: "JV-test",
        subject: "Pending withdrawal",
        requesterEmail: "person@example.com",
        supportEmail: "support@jimvio.com",
      },
      { enabled: false, send: async () => { called = true; return { ok: true }; } },
    );
    assert.deepEqual(result, { sent: false, reason: "not_configured" });
    assert.equal(called, false);

    const payloads: Array<{ to: string; subject: string; text?: string; html: string }> = [];
    const sent = await deliverSupportNotice(
      {
        publicRef: "JV-test",
        subject: "Pending withdrawal",
        requesterEmail: "person@example.com",
        supportEmail: "support@jimvio.com",
      },
      {
        enabled: true,
        send: async (input) => {
          payloads.push(input);
          return { ok: true, id: "mail_1" };
        },
      },
    );
    assert.deepEqual(sent, { sent: true, reason: "sent" });
    assert.deepEqual(payloads.map((item) => item.to).sort(), ["person@example.com", "support@jimvio.com"]);
    assert.equal(payloads.some((item) => (item.text ?? "").includes("4242")), false);
    assert.equal(payloads.some((item) => item.html.includes("internal staff note")), false);

    payloads.length = 0;
    const reply = await deliverSupportNotice(
      {
        publicRef: "JV-test",
        subject: "Pending withdrawal",
        requesterEmail: "person@example.com",
        supportEmail: "support@jimvio.com",
        reply: "We are reviewing the withdrawal on your wallet page.",
      },
      {
        enabled: true,
        send: async (input) => {
          payloads.push(input);
          return { ok: true, id: "mail_2" };
        },
      },
    );
    assert.equal(reply.sent, true);
    assert.deepEqual(payloads.map((item) => item.to), ["person@example.com"]);
    assert.match(payloads[0].html, /reviewing the withdrawal/);
    assert.equal(payloads[0].html.includes("internal staff note"), false);
  });

  it("limits customer status changes to reopen", () => {
    assert.equal(canTransition("resolved", "open", "customer"), true);
    assert.equal(canTransition("open", "closed", "customer"), false);
    assert.equal(canTransition("open", "in_progress", "staff"), true);
  });

  it("keeps the assistant provider key on the server", () => {
    const route = readFileSync(new URL("../../app/api/support/ask/route.ts", import.meta.url), "utf8");
    assert.match(route, /GOOGLE_GENERATIVE_AI_API_KEY/);
    assert.equal(route.includes("AIza"), false);
    assert.match(route, /knowledgeAnswer/);
  });
});
