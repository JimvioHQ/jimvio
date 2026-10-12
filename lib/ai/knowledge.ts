/**
 * Public Jimvio facts checked against routes and the earning guide.
 * `body` is model context. `publicAnswer` is what a guide may show.
 * Do not add fees, payout timing, or features that are not implemented.
 */

import { CLARIFYING_GUIDE, PRIVATE_ACCOUNT_GUIDE } from "@/lib/ai/guide-copy";

type PublicLink = { label: string; href: string };

type Article = {
  id: string;
  title: string;
  keywords: string[];
  body: string;
  links: PublicLink[];
  publicAnswer: string;
};

function linkLine(links: PublicLink[]): string {
  return links.map((link) => `[${link.label}](${link.href})`).join(" · ");
}

const ARTICLES: Article[] = [
  {
    id: "marketplace",
    title: "Marketplace",
    keywords: ["marketplace", "buy", "shop", "product", "listing", "sell", "physical", "digital"],
    body: "People discover and buy listings on /marketplace. Sellers create and manage products at /seller/products. A listing needs the title, price, and details the seller provides. Physical products can include variants where the product form has them. Digital listings such as downloads or courses do not ship as a package. Creating an account is free. Jimvio AI cannot publish a listing or see a private catalog from chat.",
    links: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Seller products", href: "/seller/products" },
    ],
    publicAnswer: `Browse listings on the marketplace, or add a product from seller products. A listing needs the title, price, and details you provide. Creating an account is free.

${linkLine([
  { label: "Marketplace", href: "/marketplace" },
  { label: "Seller products", href: "/seller/products" },
])}`,
  },
  {
    id: "orders",
    title: "Orders, shipping, and fulfillment",
    keywords: ["order", "orders", "shipping", "fulfillment", "delivery", "tracking", "inventory", "delayed", "delay"],
    body: "Marketplace buyers review their own orders at /orders. The page shows the status already stored on the order, such as pending, confirmed, processing, shipped, delivered, completed, cancelled, or refunded, and the payment state already stored, such as awaiting payment, processing, paid, failed, refunded, or cancelled. If an order is delayed, open that order and use only the status and tracking it already shows. Store operators review store orders at /commerce/orders, fulfillment at /commerce/fulfillment, and shipping zones at /commerce/shipping. Do not invent a tracking number, a delivery date, or claim the order changed.",
    links: [
      { label: "Orders", href: "/orders" },
      { label: "Store orders", href: "/commerce/orders" },
      { label: "Fulfillment", href: "/commerce/fulfillment" },
      { label: "Shipping", href: "/commerce/shipping" },
    ],
    publicAnswer: `Buyers review their orders on the orders page. It shows the status and payment state already saved on the order. If an order is delayed, open that order and use the status and tracking it already shows. Store operators review store orders, fulfillment, and shipping in commerce.

${linkLine([
  { label: "Orders", href: "/orders" },
  { label: "Store orders", href: "/commerce/orders" },
  { label: "Fulfillment", href: "/commerce/fulfillment" },
  { label: "Shipping", href: "/commerce/shipping" },
])}`,
  },
  {
    id: "affiliate",
    title: "Affiliates",
    keywords: ["affiliate", "referral", "commission", "commissions", "promote", "tracked", "payout"],
    body: "The affiliate area is at /affiliates. Tracked referral links are at /affiliates/links. Payout records are at /affiliates/payouts. Commission amounts, and whether a commission can be paid, are whatever that program or those screens already show. Do not quote a percentage, a payout date, or say a commission is eligible unless that screen already says so.",
    links: [
      { label: "Affiliates", href: "/affiliates" },
      { label: "Tracked links", href: "/affiliates/links" },
      { label: "Payouts", href: "/affiliates/payouts" },
    ],
    publicAnswer: `Open the affiliate area for tracked links and payout records. A commission amount, and whether it can be paid, is whatever that program or those screens already show.

${linkLine([
  { label: "Affiliates", href: "/affiliates" },
  { label: "Tracked links", href: "/affiliates/links" },
  { label: "Payouts", href: "/affiliates/payouts" },
])}`,
  },
  {
    id: "ugc",
    title: "UGC and clipping",
    keywords: ["ugc", "clip", "clipping", "campaign", "creator", "brief", "submit", "submission", "approval", "reward"],
    body: "Discover UGC campaigns at /ugc and clipping at /ugc/clipping. Open a campaign to join it, then submit from that campaign's submit page using a link the brief accepts. Submitted work is listed at /ugc/submissions. Approval, requirements, and rewards are only what that campaign brief already says. Do not invent a campaign, a reward amount, or an approval.",
    links: [
      { label: "UGC", href: "/ugc" },
      { label: "Clipping", href: "/ugc/clipping" },
      { label: "Submissions", href: "/ugc/submissions" },
    ],
    publicAnswer: `Discover campaigns on UGC and clipping. Open a campaign to join it, then submit from that campaign's submit page. Submitted work is listed on submissions. Approval, requirements, and rewards are only what that campaign brief already says.

${linkLine([
  { label: "UGC", href: "/ugc" },
  { label: "Clipping", href: "/ugc/clipping" },
  { label: "Submissions", href: "/ugc/submissions" },
])}`,
  },
  {
    id: "community",
    title: "Communities and live",
    keywords: ["community", "communities", "live", "screen", "share", "session", "post"],
    body: "Communities are at /communities. A new community starts at /communities/create. Live sessions are hosted from /communities/live. Screen sharing is available when the live room reports that this browser can share a screen. Jimvio AI can create a free public community only through the confirmed community action, and it says so only after that action returns a link.",
    links: [
      { label: "Communities", href: "/communities" },
      { label: "Create a community", href: "/communities/create" },
      { label: "Live", href: "/communities/live" },
    ],
    publicAnswer: `Communities are listed on the communities page, and a new community starts from create. Live sessions are hosted from the live page. Screen sharing is available when the live room says this browser can share a screen.

${linkLine([
  { label: "Communities", href: "/communities" },
  { label: "Create a community", href: "/communities/create" },
  { label: "Live", href: "/communities/live" },
])}`,
  },
  {
    id: "wallet",
    title: "Wallet and payments",
    keywords: ["wallet", "payout", "withdraw", "payment", "transaction", "balance", "flutterwave", "binance"],
    body: "The wallet is at /wallet, with transactions at /wallet/transactions, withdrawals at /wallet/withdrawals, and payout methods at /wallet/payout-methods. Checkout methods that exist in the product are Flutterwave card checkout, mobile money, Binance Pay, and NOWPayments. Availability still depends on the checkout already shown for that order and country. Wallet withdrawal choices that can be selected are bank transfer, mobile money, cryptocurrency, and Binance ID. A pending or failed payment is the status already shown on the order or transaction. Do not claim a payment, payout, or refund succeeded, and do not say which method a specific account can use.",
    links: [
      { label: "Wallet", href: "/wallet" },
      { label: "Transactions", href: "/wallet/transactions" },
      { label: "Withdrawals", href: "/wallet/withdrawals" },
      { label: "Payout methods", href: "/wallet/payout-methods" },
    ],
    publicAnswer: `The wallet includes transactions, withdrawals, and payout methods. Checkout methods in the product are Flutterwave card checkout, mobile money, Binance Pay, and NOWPayments. What you can use still depends on the checkout shown for that order and country. Withdrawal choices that can be selected are bank transfer, mobile money, cryptocurrency, and Binance ID. A pending or failed payment is the status already shown on the order or transaction.

${linkLine([
  { label: "Wallet", href: "/wallet" },
  { label: "Transactions", href: "/wallet/transactions" },
  { label: "Withdrawals", href: "/wallet/withdrawals" },
  { label: "Payout methods", href: "/wallet/payout-methods" },
])}`,
  },
  {
    id: "account",
    title: "Account, profile, and verification",
    keywords: ["account", "profile", "settings", "password", "security", "verification", "identity", "sign", "rejected", "pending"],
    body: "New accounts start at /register and sign-in at /login. Profile details are edited at /identity/edit. Account settings are at /identity/settings. Identity verification is at /identity/verification. A verification request can be pending, approved, or rejected. Pending means it is not approved yet. Rejected means it was not approved. Notification settings are at /settings/notifications. Jimvio AI cannot see another person's account and cannot confirm verification, a password change, or a review result from chat.",
    links: [
      { label: "Register", href: "/register" },
      { label: "Sign in", href: "/login" },
      { label: "Profile", href: "/identity/edit" },
      { label: "Settings", href: "/identity/settings" },
      { label: "Verification", href: "/identity/verification" },
      { label: "Notifications", href: "/settings/notifications" },
    ],
    publicAnswer: `Create an account from register, or sign in from login. Profile details are on the profile page, account settings are in settings, and identity verification has its own page. A verification request can be pending, approved, or rejected. Pending means it is not approved yet. Rejected means it was not approved. Notification settings are on the notifications page.

${linkLine([
  { label: "Register", href: "/register" },
  { label: "Sign in", href: "/login" },
  { label: "Profile", href: "/identity/edit" },
  { label: "Settings", href: "/identity/settings" },
  { label: "Verification", href: "/identity/verification" },
  { label: "Notifications", href: "/settings/notifications" },
])}`,
  },
  {
    id: "copilot",
    title: "Jimvio AI",
    keywords: ["copilot", "assistant", "jimvio ai", "help", "faq", "navigate"],
    body: "Jimvio AI explains public product workflows and links to the right page. It does not complete payments, refunds, payouts, or order updates. If a feature, fee, or timeline is not in the verified context, it says it cannot verify that.",
    links: [],
    publicAnswer:
      "I can explain public Jimvio workflows and point you to the right page. I don't complete payments, refunds, payouts, or order updates from this chat.",
  },
];

const STOP_WORDS = new Set([
  "how", "what", "when", "where", "does", "have", "with", "that", "this", "from", "your", "about", "want",
  "view", "check", "find", "open", "start", "join", "create", "manage", "update", "complete", "mean",
  "should", "could", "would", "please", "help", "page", "using", "used", "make", "take", "show", "tell",
  "need", "they", "them", "into", "which", "actually", "supported", "system", "information",
]);

function score(article: Article, query: string): number {
  const haystack = query.toLowerCase();
  return article.keywords.reduce((total, keyword) => (haystack.includes(keyword) ? total + 2 : total), 0);
}

function corpus(): string {
  return ARTICLES.map((article) => `${article.title} ${article.body} ${article.publicAnswer} ${article.keywords.join(" ")}`).join("\n").toLowerCase();
}

function unknownWords(query: string): string[] {
  const known = corpus();
  return (query.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (word) => word.length > 3 && !STOP_WORDS.has(word) && !known.includes(word),
  );
}

function rankedArticles(query: string) {
  return ARTICLES
    .map((article) => ({ article, score: score(article, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

function linkScore(link: PublicLink, query: string): number {
  return link.href
    .split("/")
    .filter((part) => part.length > 2)
    .reduce((total, part) => (query.includes(part) ? total + 1 : total), 0);
}

function relevantLinks(article: Article, query: string): PublicLink[] {
  const q = query.toLowerCase();
  const ranked = [...article.links].sort((a, b) => linkScore(b, q) - linkScore(a, q));
  if (!ranked.length) return [];
  const best = linkScore(ranked[0], q);
  return (best > 0 ? ranked.filter((link) => linkScore(link, q) === best) : ranked).slice(0, 2);
}

function needsPrivateAccount(query: string): boolean {
  const q = query.toLowerCase();
  const whereHow = /\b(where|how do i|how can i|which page|what page)\b/.test(q);
  const statusAsk = /\b(status|approved|rejected|paid|unpaid|balance|amount|pending|refunded|shipped|tracking)\b/.test(q);
  if (whereHow && !statusAsk) return false;
  if (/\b(am i|was i|did my|has my|is my|was my|were my)\b/.test(q)) return true;
  const personal = /\b(my|mine)\b/.test(q) || /\bthis account\b/.test(q);
  const sensitive = /\b(order|orders|payment|payments|wallet|balance|verification|identity|payout|payouts|refund|commission|commissions|account)\b/.test(q);
  return personal && sensitive && (statusAsk || /\b(show|tell|check|see|know|confirm)\b/.test(q));
}

export function verifiedGuideHrefs(): string[] {
  return [...new Set(ARTICLES.flatMap((article) => article.links.map((link) => link.href)))];
}

/** Natural guide copy. Omits model instructions and unverified routes. */
export function composePublicGuide(query: string): string {
  const hits = rankedArticles(query);
  const unknown = unknownWords(query);
  const matchedKeywords = hits.flatMap((item) =>
    item.article.keywords.filter((keyword) => query.toLowerCase().includes(keyword)),
  );
  if (!hits.length || unknown.length > matchedKeywords.length) return CLARIFYING_GUIDE;

  if (needsPrivateAccount(query)) {
    const links = relevantLinks(hits[0].article, query);
    return links.length ? `${PRIVATE_ACCOUNT_GUIDE}\n\n${linkLine(links)}` : PRIVATE_ACCOUNT_GUIDE;
  }

  return hits[0].article.publicAnswer;
}

export function retrieveJimvioKnowledge(query: string, limit = 3): string {
  const hits = rankedArticles(query).slice(0, limit);
  const unknown = unknownWords(query);

  if (!hits.length || unknown.length > 0) {
    const unknownNote = unknown.length ? ` Unverified words: ${unknown.join(", ")}.` : "";
    const matched = hits.map((item) => `${item.article.title}: ${item.article.body}`).join("\n");
    return `Internal note, not a customer answer: no verified Jimvio article covers this exact question.${unknownNote} Ask one short clarifying question and offer the closest public Jimvio path. Do not invent a page or a number. Never quote this note.${matched ? `\nRelated public facts:\n${matched}` : ""}`;
  }

  return hits.map((item) => `${item.article.title}: ${item.article.body}`).join("\n");
}

export function buildGroundedPrompt(base: string, userText: string): string {
  return `${base}

Verified Jimvio context for this question:
${retrieveJimvioKnowledge(userText)}

Use only that context and the conversation. Answer in the language the customer used, in your own words. If a specific fact is not in the context, ask one short clarifying question and offer the closest public path. Never quote internal notes, and never tell the customer to "say" something. A greeting gets a short welcome, not a product essay.`;
}
