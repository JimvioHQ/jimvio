import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SUPPORT_ARTICLES, articlesInCategory, getSupportArticle, relatedArticles } from "./articles";
import { knowledgeAnswer, preferDirectSupportAnswer } from "./knowledge-answer";
import { searchSupportArticles } from "./search";
import { SUPPORT_CATEGORIES } from "./types";
import { customerVisibleMessages } from "./format";
import { deliverConversationReply, deliverSupportNotice } from "./notify";
import { canTransition, ticketSearchTerm, validateTicketInput } from "./validation";
import { customerSupportEmail, supportNotificationRecipient } from "../contact-email";
import { agentDisplayName, agentGreetingDraft, agentJoinedMessage } from "./agent-identity";
import { customerReplySubject, sanitizeEmailSubject, staffHandoffSubject, ticketReceivedSubject } from "./email-subject";
import { showSupportLauncher } from "./routes";
import {
  REMOVED_AVAILABILITY_BANNER,
  SUPPORT_CHAT_SUGGESTIONS,
  SUPPORT_COMPOSER_PLACEHOLDER,
  SUPPORT_WELCOME_GREETING,
  SUPPORT_WELCOME_PROMPT,
} from "./welcome";
import { assistantRevealChunks, revealDelayMs } from "./reveal";
import {
  countAvailableAgents,
  customerQueueLabel,
  handoffCustomerNote,
  shouldAnswerWithAssistant,
  shouldEmailCustomerReply,
  statusAfterCustomerMessage,
  statusAfterHandoff,
  toCustomerChatMessages,
  validateChatBody,
} from "./conversation-policy";

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

describe("support direct answers", () => {
  it("rejects a link list and keeps a stepped answer", () => {
    const fallback = "Open the new ticket page.\n\n1. Sign in.\n\nI have not looked up your account.";
    assert.equal(preferDirectSupportAnswer("See /help/articles/contact-support-team", fallback), fallback);
    assert.equal(preferDirectSupportAnswer("", fallback), fallback);
    const direct = "Create the ticket from the new ticket page after you sign in.\n\n1. Open /help/tickets/new.\n2. Describe the issue.\n\nI have not opened a ticket.";
    assert.equal(preferDirectSupportAnswer(direct, fallback), direct);
  });

  it("tells the live support prompt to answer before linking", () => {
    const source = readFileSync(new URL("./answer-question.ts", import.meta.url), "utf8");
    assert.match(source, /direct answer in the first sentence/);
    assert.match(source, /numbered steps/);
    assert.match(source, /has not opened a ticket/);
    assert.match(source, /Kinyarwanda/);
    assert.match(source, /preferDirectSupportAnswer/);
    assert.match(source, /geminiFallback: false/);
  });
});

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
    const otherUnknown = knowledgeAnswer(SUPPORT_ARTICLES, "marble telescope customs form");
    assert.match(unknown.answer, /could not find/i);
    assert.match(unknown.answer, /info@jimvio.com/);
    assert.equal(unknown.answer.includes("quantum pineapple warranty"), true);
    assert.notEqual(unknown.answer, otherUnknown.answer);
    assert.equal(unknown.slugs.length, 0);
    assert.equal(unknown.answer.includes(REMOVED_AVAILABILITY_BANNER), false);
    const ticket = knowledgeAnswer(SUPPORT_ARTICLES, "How do I create a support ticket?");
    assert.match(ticket.answer, /1\./);
    assert.match(ticket.answer, /I have not looked up/);
    assert.equal(/ticket was (opened|created)/i.test(ticket.answer), false);
    const login = knowledgeAnswer(SUPPORT_ARTICLES, "I cannot sign in");
    assert.match(login.answer, /1\./);
    const publish = knowledgeAnswer(SUPPORT_ARTICLES, "How do I publish a product?");
    assert.match(publish.answer, /seller products/i);
    const order = knowledgeAnswer(SUPPORT_ARTICLES, "How do I track an order?");
    const earnings = knowledgeAnswer(SUPPORT_ARTICLES, "How do I understand and withdraw my earnings?");
    assert.notEqual(order.answer, earnings.answer);
    assert.match(order.answer, /order/i);
    assert.match(earnings.answer, /wallet|payout|earning/i);
    assert.match(order.answer, /what do you see/i);
    assert.equal(order.answer.toLowerCase().includes("i have looked up your wallet"), false);
    assert.equal(order.answer.includes("This comes from Jimvio help articles"), false);
    assert.equal(order.answer.includes("not from a live account lookup"), false);
  });

  it("names the agent who joins and builds safe email subjects", () => {
    assert.equal(agentDisplayName({ displayName: "Alex" }), "Alex");
    assert.equal(agentDisplayName({ fullName: "Alex Rivera" }), "Alex Rivera");
    assert.equal(agentDisplayName({ email: "alex@jimvio.com" }), "alex");
    assert.equal(agentJoinedMessage("Alex").includes("has joined"), true);
    assert.equal(agentJoinedMessage("Alex").includes("reviewed"), false);
    assert.match(agentGreetingDraft("Alex"), /I'm Alex from Jimvio Support/);
    assert.equal(customerReplySubject("Alex\nBcc: evil"), "Alex Bcc: evil from Jimvio Support replied to your conversation");
    assert.equal(sanitizeEmailSubject("a\r\nb").includes("\n"), false);
    assert.equal(staffHandoffSubject(), "A new customer conversation needs attention | Jimvio");
    assert.match(ticketReceivedSubject("order question"), /order question/);
    assert.equal(ticketReceivedSubject(""), "Your Jimvio support request has been received");
    const inbox = readFileSync(new URL("../../components/support/admin-live-inbox.tsx", import.meta.url), "utf8");
    const nav = readFileSync(new URL("../../components/shell/AppTopNav.tsx", import.meta.url), "utf8");
    const chat = readFileSync(new URL("../../components/support/support-chat.tsx", import.meta.url), "utf8");
    assert.match(inbox, /Internal note/);
    assert.match(inbox, /Accept conversation/);
    assert.equal(inbox.includes("visibility: \"internal\"") || inbox.includes('send("internal")') || inbox.includes('send(mode)'), true);
    assert.match(nav, /showJimvioAi/);
    assert.match(nav, /showProducts=\{false\}/);
    assert.match(chat, /authorName/);
    assert.equal(chat.includes("Leave a ticket"), false);
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
        supportEmail: "info@jimvio.com",
      },
      { enabled: false, send: async () => { called = true; return { ok: true, status: "sent" as const }; } },
    );
    assert.deepEqual(result, { sent: false, reason: "not_configured" });
    assert.equal(called, false);

    const payloads: Array<{ to: string; subject: string; text?: string; html: string }> = [];
    const sent = await deliverSupportNotice(
      {
        publicRef: "JV-test",
        subject: "Pending withdrawal",
        requesterEmail: "person@example.com",
        supportEmail: "info@jimvio.com",
      },
      {
        enabled: true,
        send: async (input) => {
          payloads.push(input);
          return { ok: true, id: "mail_1", status: "sent" as const };
        },
      },
    );
    assert.deepEqual(sent, { sent: true, reason: "sent" });
    assert.deepEqual(payloads.map((item) => item.to).sort(), ["info@jimvio.com", "person@example.com"]);
    assert.equal(payloads.some((item) => (item.text ?? "").includes("4242")), false);
    assert.equal(payloads.some((item) => item.html.includes("internal staff note")), false);

    payloads.length = 0;
    const reply = await deliverSupportNotice(
      {
        publicRef: "JV-test",
        subject: "Pending withdrawal",
        requesterEmail: "person@example.com",
        supportEmail: "info@jimvio.com",
        reply: "We are reviewing the withdrawal on your wallet page.",
      },
      {
        enabled: true,
        send: async (input) => {
          payloads.push(input);
          return { ok: true, id: "mail_2", status: "sent" as const };
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
    const answer = readFileSync(new URL("./answer-question.ts", import.meta.url), "utf8");
    const admin = readFileSync(new URL("../../app/api/admin/support/conversations/route.ts", import.meta.url), "utf8");
    const handoff = readFileSync(new URL("../../app/api/support/conversations/[id]/handoff/route.ts", import.meta.url), "utf8");
    assert.match(answer, /readOpenAIKey/);
    assert.match(answer, /Never invent payment status/);
    assert.equal(answer.includes("GOOGLE_GENERATIVE_AI_API_KEY"), false);
    assert.match(answer, /knowledgeAnswer/);
    assert.equal(answer.includes("AIza"), false);
    assert.equal(route.includes("AIza"), false);
    assert.match(route, /answerSupportQuestion/);
    assert.match(admin, /requirePlatformAdmin/);
    assert.equal(handoff.includes("service_role"), false);
  });

  it("keeps live chat ownership, queue state, and internal notes honest", () => {
    assert.equal(statusAfterHandoff("ai"), "queued");
    assert.equal(statusAfterHandoff("active"), "active");
    assert.equal(statusAfterCustomerMessage("resolved", "human"), "queued");
    assert.equal(statusAfterCustomerMessage("resolved", "ai"), "ai");
    assert.equal(shouldAnswerWithAssistant("queued", "human"), false);
    assert.equal(shouldAnswerWithAssistant("ai", "ai"), true);
    assert.equal(shouldEmailCustomerReply({ author_role: "staff", visibility: "internal" }), false);
    assert.equal(shouldEmailCustomerReply({ author_role: "ai", visibility: "customer" }), false);
    assert.equal(shouldEmailCustomerReply({ author_role: "staff", visibility: "customer" }), true);
    assert.equal(countAvailableAgents([{ last_seen_at: new Date(Date.now() - 120_000).toISOString(), available: true }]), 0);
    assert.equal(countAvailableAgents([{ last_seen_at: new Date().toISOString(), available: true }]), 1);
    const secret = validateChatBody("my password is hunter2");
    assert.equal(secret.ok, false);
    const visible = toCustomerChatMessages([
      { id: "n", author_role: "staff", visibility: "internal", body: "staff only", created_at: "2026-01-01" },
      { id: "a", author_role: "ai", visibility: "customer", body: "from articles", created_at: "2026-01-02", answer_mode: "knowledge", articles: [{ slug: "track-order", title: "Track", href: "/help/articles/track-order" }] },
    ]);
    assert.equal(visible.length, 1);
    assert.equal(visible[0]?.answerMode, "knowledge");
    assert.equal(JSON.stringify(visible).includes("staff only"), false);
  });

  it("shows the support launcher only on Support Center routes", () => {
    assert.equal(showSupportLauncher("/help"), true);
    assert.equal(showSupportLauncher("/help/articles/track-order"), true);
    assert.equal(showSupportLauncher("/help/topics/payments"), true);
    assert.equal(showSupportLauncher("/help/tickets/JV-1"), true);
    assert.equal(showSupportLauncher("/help/contact"), true);
    assert.equal(showSupportLauncher("/"), false);
    assert.equal(showSupportLauncher("/marketplace"), false);
    assert.equal(showSupportLauncher("/checkout"), false);
    assert.equal(showSupportLauncher("/cart"), false);
    assert.equal(showSupportLauncher("/communities"), false);
    assert.equal(showSupportLauncher("/help/"), true);
    assert.equal(showSupportLauncher("/help/articles/"), true);
    assert.equal(showSupportLauncher("/legal"), false);
    assert.equal(showSupportLauncher("/help-center"), false);
    assert.equal(showSupportLauncher("/helpful"), false);
  });

  it("reveals assistant text in chunks and skips animation for reduced motion", () => {
    const text = "Jimvio keeps payout requests in the wallet. Open Wallet, then request a payout when the balance is eligible for transfer.";
    const animated = assistantRevealChunks(text, false);
    assert.ok(animated.length > 1);
    assert.equal(animated.join(""), text);
    assert.deepEqual(assistantRevealChunks(text, true), [text]);
    assert.equal(revealDelayMs(animated.length, false) > 0, true);
    assert.equal(revealDelayMs(animated.length, true), 0);
    const chat = readFileSync(new URL("../../components/support/support-chat.tsx", import.meta.url), "utf8");
    const widget = readFileSync(new URL("../../components/support/live-support-widget.tsx", import.meta.url), "utf8");
    assert.equal(chat.includes("From the Jimvio knowledge base"), false);
    assert.match(widget, /createPortal/);
    assert.match(widget, /fixed /);
    assert.match(widget, /data-support-launcher/);
  });

  it("uses info@jimvio.com for customer support and folds obsolete aliases", () => {
    assert.equal(customerSupportEmail(), "info@jimvio.com");
    assert.equal(supportNotificationRecipient("support@jimvio.com"), "info@jimvio.com");
    assert.equal(supportNotificationRecipient(""), "info@jimvio.com");
    assert.equal(supportNotificationRecipient("ops-inbox@example.com"), "ops-inbox@example.com");
    assert.equal(handoffCustomerNote(0).includes("marked available"), false);
    assert.match(handoffCustomerNote(0), /follow-up/);
    assert.equal(handoffCustomerNote(0).includes("support ticket"), false);
    assert.equal(handoffCustomerNote(1).includes("replied"), false);
    assert.equal(customerQueueLabel("ai", "error"), null);
    assert.equal(customerQueueLabel("ai", "unavailable"), null);
    assert.equal(customerQueueLabel(null, "unavailable"), null);
    const queued = customerQueueLabel("queued", "unavailable");
    assert.match(queued ?? "", /follow-up/);
    assert.equal((queued ?? "").includes(REMOVED_AVAILABILITY_BANNER), false);
  });

  it("opens the widget as a conversation without the old banner or ticket button", () => {
    const chat = readFileSync(new URL("../../components/support/support-chat.tsx", import.meta.url), "utf8");
    const tickets = readFileSync(new URL("../../app/api/support/tickets/route.ts", import.meta.url), "utf8");
    assert.equal(chat.includes(REMOVED_AVAILABILITY_BANNER), false);
    assert.equal(chat.includes("Ask a question about using Jimvio"), false);
    assert.equal(chat.includes("Leave a ticket"), false);
    assert.equal(chat.includes("customerQueueLabel"), false);
    assert.match(chat, /\{SUPPORT_WELCOME_GREETING\}/);
    assert.match(chat, /\{SUPPORT_WELCOME_PROMPT\}/);
    assert.match(chat, /placeholder=\{SUPPORT_COMPOSER_PLACEHOLDER\}/);
    assert.match(SUPPORT_WELCOME_GREETING, /How can I help you today/);
    assert.match(SUPPORT_WELCOME_PROMPT, /next steps/);
    assert.equal(SUPPORT_COMPOSER_PLACEHOLDER, "How can I help you today?");
    assert.equal(chat.includes("Talk to a human agent"), true);
    assert.equal(chat.includes("/api/support/ask"), true);
    assert.match(chat, /\{suggestion\.label\}/);
    assert.match(chat, /send\(suggestion\.question\)/);
    assert.deepEqual(
      SUPPORT_CHAT_SUGGESTIONS.map((suggestion) => suggestion.label),
      ["Track an order", "Understand my earnings", "Manage my account", "Get help with selling"],
    );
    for (const suggestion of SUPPORT_CHAT_SUGGESTIONS) {
      const answer = knowledgeAnswer(SUPPORT_ARTICLES, suggestion.question);
      assert.ok(answer.slugs.length > 0, suggestion.label);
      assert.match(answer.answer, /have not looked up/i);
    }
    assert.match(tickets, /export async function POST/);
    assert.match(tickets, /export async function GET/);
  });

  it("does not email a chat reply when delivery is disabled", async () => {
    let called = false;
    const skipped = await deliverConversationReply(
      { publicRef: "SC-test", subject: "Help", requesterEmail: "person@example.com", reply: "Saved reply" },
      { enabled: false, send: async () => { called = true; return { ok: true, status: "sent" as const }; } },
    );
    assert.deepEqual(skipped, { sent: false, reason: "not_configured" });
    assert.equal(called, false);
  });
});
