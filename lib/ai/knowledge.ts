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
    body: "People discover and buy listings on /marketplace. Sellers add and manage products at /seller/products. A listing needs the title, price, and details the seller provides. Physical products can include variants where the product form has them. Digital listings such as downloads or courses do not ship as a package. Creating an account is free. Jimvio AI cannot publish a listing from chat.",
  },
  {
    id: "orders",
    title: "Orders, shipping, and fulfillment",
    keywords: ["order", "shipping", "fulfillment", "delivery", "tracking", "inventory"],
    body: "Store orders are reviewed in Commerce at /commerce/orders. Fulfillment status is managed at /commerce/fulfillment, and shipping zones at /commerce/shipping. Buyers review an order from the store account orders page after checkout. Tracking and delivery state are whatever that order already shows. Do not invent a tracking number or claim an order changed.",
  },
  {
    id: "affiliate",
    title: "Affiliates",
    keywords: ["affiliate", "referral", "commission", "promote", "tracked"],
    body: "Affiliate marketing uses a tracked link from the affiliate area at /affiliates. Commission is set on the program or product, not as one platform-wide percentage. Recorded earnings are reviewed in the affiliate tools and the wallet. Do not quote a percentage or payout date.",
  },
  {
    id: "ugc",
    title: "UGC and clipping",
    keywords: ["ugc", "clip", "clipping", "campaign", "creator", "brief"],
    body: "UGC and clipping campaigns are briefs at /ugc. A creator reads a brief, joins it, and submits the content it asks for. Brands create briefs from the campaign center. Pay depends on that brief. Browsing does not require inventing a store.",
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
    body: "The wallet is at /wallet, with transactions at /wallet/transactions, withdrawals at /wallet/withdrawals, and payout methods at /wallet/payout-methods. Checkout methods that exist are Flutterwave card checkout, mobile money, Binance Pay, and NOWPayments. Wallet withdrawal choices that can be selected are bank transfer, mobile money, cryptocurrency, and Binance ID. Do not claim a payment, payout, or refund succeeded from chat.",
  },
  {
    id: "account",
    title: "Account, profile, and verification",
    keywords: ["account", "profile", "settings", "password", "security", "verification", "identity", "sign"],
    body: "New accounts start at /register and sign-in at /login. Profile and identity settings are at /identity/settings. Identity verification is at /identity/verification. Notification settings are at /settings/notifications. Jimvio AI cannot see another person's account and cannot confirm verification or a password reset unless that page says so.",
  },
  {
    id: "copilot",
    title: "Jimvio AI",
    keywords: ["copilot", "assistant", "jimvio ai", "help", "faq", "navigate"],
    body: "Jimvio AI explains public product workflows and links to the right page. It does not complete payments, refunds, payouts, or order updates. If a feature, fee, or timeline is not in the verified context, it says it cannot verify that.",
  },
];

const STOP_WORDS = new Set(["how", "what", "when", "where", "does", "have", "with", "that", "this", "from", "your", "about", "want"]);

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
