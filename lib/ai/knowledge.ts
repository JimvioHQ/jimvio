/**
 * Public Jimvio facts checked against routes and the earning guide.
 * Do not add fees, payout timing, or features that are not implemented.
 */

type Article = {
  id: string;
  title: string;
  keywords: string[];
  body: string;
};

const ARTICLES: Article[] = [
  {
    id: "marketplace",
    title: "Marketplace",
    keywords: ["marketplace", "buy", "shop", "product", "listing", "sell", "physical", "digital"],
    body: "People discover and buy listings on /marketplace. Sellers create and manage products at /seller/products. A listing needs the title, price, and details the seller provides. Physical products can include variants where the product form has them. Digital listings such as downloads or courses do not ship as a package. Creating an account is free. Jimvio AI cannot publish a listing or see a private catalog from chat.",
  },
  {
    id: "orders",
    title: "Orders, shipping, and fulfillment",
    keywords: ["order", "orders", "shipping", "fulfillment", "delivery", "tracking", "inventory", "delayed", "delay"],
    body: "Marketplace buyers review their own orders at /orders. The page shows the status already stored on the order, such as pending, confirmed, processing, shipped, delivered, completed, cancelled, or refunded, and the payment state already stored, such as awaiting payment, processing, paid, failed, refunded, or cancelled. If an order is delayed, open that order and use only the status and tracking it already shows. Store operators review store orders at /commerce/orders, fulfillment at /commerce/fulfillment, and shipping zones at /commerce/shipping. Do not invent a tracking number, a delivery date, or claim the order changed.",
  },
  {
    id: "affiliate",
    title: "Affiliates",
    keywords: ["affiliate", "referral", "commission", "commissions", "promote", "tracked", "payout"],
    body: "The affiliate area is at /affiliates. Tracked referral links are at /affiliates/links. Payout records are at /affiliates/payouts. Commission amounts, and whether a commission can be paid, are whatever that program or those screens already show. Do not quote a percentage, a payout date, or say a commission is eligible unless that screen already says so.",
  },
  {
    id: "ugc",
    title: "UGC and clipping",
    keywords: ["ugc", "clip", "clipping", "campaign", "creator", "brief", "submit", "submission", "approval", "reward"],
    body: "Discover UGC campaigns at /ugc and clipping at /ugc/clipping. Open a campaign to join it, then submit from that campaign's submit page using a link the brief accepts. Submitted work is listed at /ugc/submissions. Approval, requirements, and rewards are only what that campaign brief already says. Do not invent a campaign, a reward amount, or an approval.",
  },
  {
    id: "community",
    title: "Communities and live",
    keywords: ["community", "communities", "live", "screen", "share", "session", "post"],
    body: "Communities are at /communities. A new community starts at /communities/create. Live sessions are hosted from /communities/live. Screen sharing is available when the live room reports that this browser can share a screen. Jimvio AI can create a free public community only through the confirmed community action, and it says so only after that action returns a link.",
  },
  {
    id: "wallet",
    title: "Wallet and payments",
    keywords: ["wallet", "payout", "withdraw", "payment", "transaction", "balance", "flutterwave", "binance"],
    body: "The wallet is at /wallet, with transactions at /wallet/transactions, withdrawals at /wallet/withdrawals, and payout methods at /wallet/payout-methods. Checkout methods that exist in the product are Flutterwave card checkout, mobile money, Binance Pay, and NOWPayments. Availability still depends on the checkout already shown for that order and country. Wallet withdrawal choices that can be selected are bank transfer, mobile money, cryptocurrency, and Binance ID. A pending or failed payment is the status already shown on the order or transaction. Do not claim a payment, payout, or refund succeeded, and do not say which method a specific account can use.",
  },
  {
    id: "account",
    title: "Account, profile, and verification",
    keywords: ["account", "profile", "settings", "password", "security", "verification", "identity", "sign", "rejected", "pending"],
    body: "New accounts start at /register and sign-in at /login. Profile details are edited at /identity/edit. Account settings are at /identity/settings. Identity verification is at /identity/verification. A verification request can be pending, approved, or rejected. Pending means it is not approved yet. Rejected means it was not approved. Notification settings are at /settings/notifications. Jimvio AI cannot see another person's account and cannot confirm verification, a password change, or a review result from chat.",
  },
  {
    id: "copilot",
    title: "Jimvio AI",
    keywords: ["copilot", "assistant", "jimvio ai", "help", "faq", "navigate"],
    body: "Jimvio AI explains public product workflows and links to the right page. It does not complete payments, refunds, payouts, or order updates. If a feature, fee, or timeline is not in the verified context, it says it cannot verify that.",
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

export function retrieveJimvioKnowledge(query: string, limit = 3): string {
  const hits = ARTICLES
    .map((article) => ({ article, score: score(article, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const corpus = ARTICLES.map((article) => `${article.title} ${article.body} ${article.keywords.join(" ")}`).join("\n").toLowerCase();
  const unknownWords = (query.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (word) => word.length > 3 && !STOP_WORDS.has(word) && !corpus.includes(word),
  );

  if (!hits.length || unknownWords.length > 0) {
    const unknown = unknownWords.length ? ` Unverified words: ${unknownWords.join(", ")}.` : "";
    const matched = hits.map((item) => `${item.article.title}: ${item.article.body}`).join("\n");
    return `No verified Jimvio article covers this exact question.${unknown} Say you cannot verify that feature, fee, or policy. Do not invent a page or a number.${matched ? `\nRelated public facts:\n${matched}` : ""}`;
  }

  return hits.map((item) => `${item.article.title}: ${item.article.body}`).join("\n");
}

export function buildGroundedPrompt(base: string, userText: string): string {
  return `${base}

Verified Jimvio context for this question:
${retrieveJimvioKnowledge(userText)}

Use only that context and the conversation. Answer in the language the customer used. Admit when a Jimvio fact is not verified. Do not repeat a greeting if the conversation already started.`;
}
