/**
 * Verified Jimvio legal content constants.
 * Sourced from existing platform legal pages (Jimvio official documentation, May 2026).
 * Do not invent fee rates, retention periods, or compliance certifications here.
 */

import { MAX_AFFILIATE_COMMISSION_PERCENT } from "@/lib/affiliate/commission-tiers";
import { payoutMethodTerms, payoutPolicyItems } from "@/lib/payments/payout-terms";

export type TableRow = { col1: string; col2: string; col3: string };
export type TableRow4 = { col1: string; col2: string; col3: string; col4: string };
export type RightCard = { title: string; description: string };
export type CookieCard = {
  name: string;
  required: boolean;
  description: string;
  duration: string;
  optOut: string;
};

export const AFFILIATE_COMMISSION_ROWS: TableRow4[] = [
  { col1: "Digital Products", col2: "Up to 50%", col3: "Set by seller", col4: "Shown on product page" },
  { col1: "Physical Products", col2: "5% – 30%", col3: "Varies by seller/margin", col4: "" },
  { col1: "SaaS / Subscriptions", col2: "Up to 40% recurring", col3: "Earned on each renewal", col4: "" },
  { col1: "Exclusive Campaigns", col2: "Fixed rate / milestone", col3: "Defined per campaign brief", col4: "" },
];

export const AFFILIATE_OBLIGATIONS = [
  "Disclose your affiliate relationship clearly in all promotional content.",
  "Promote products accurately — never make false claims about features, pricing, or results.",
  "Never generate fake clicks, artificial traffic, or fraudulent conversions.",
  "Do not use spam, unsolicited emails, or paid traffic in violation of platform rules.",
  "Do not promote products through misleading landing pages, cookie stuffing, or ad hijacking.",
  "Comply with all applicable advertising and FTC disclosure guidelines.",
];

export const SELLER_FEES_ROWS: TableRow[] = [
  { col1: "Platform fee", col2: "Listed on the Pricing & Fees page", col3: "Deducted from seller earnings on each sale" },
  { col1: "Payment processing", col2: "Charged by the payment provider", col3: "Shown at checkout before the buyer pays" },
  { col1: "Affiliate commission", col2: `Set by seller, up to ${MAX_AFFILIATE_COMMISSION_PERCENT}%`, col3: "Paid to affiliates from seller proceeds" },
  ...payoutMethodTerms().map((m) => ({ col1: `Withdrawal · ${m.label}`, col2: m.fee, col3: m.speed })),
];

export const CAMPAIGN_PAYMENT_ROWS: TableRow4[] = [
  { col1: "UGC — Per Submission", col2: "Fixed rate per approved content", col3: "Within 14 days of approval", col4: "" },
  { col1: "UGC — Performance", col2: "Bonus per view/engagement milestone", col3: "Monthly, based on analytics", col4: "" },
  { col1: "Clipping — Per View", col2: "Earnings per 1,000 verified views", col3: "Monthly payout", col4: "" },
  { col1: "Clipping — Fixed", col2: "One-time payment per clip published", col3: "Within 14 days of verification", col4: "" },
];

export const CAMPAIGN_CREATOR_OBLIGATIONS = [
  "Submit only original content that you have full rights to.",
  "Follow the campaign brief exactly — do not deviate from required format, length, or guidelines.",
  "Do not use AI-generated content unless explicitly permitted in the brief.",
  "Do not submit content that contains copyrighted material (music, footage) without proper licensing.",
  "Do not plagiarize or steal content from other creators.",
  "Disclose that content is brand-sponsored per FTC and applicable advertising guidelines.",
  "Do not submit the same content to multiple competing campaigns.",
  "Do not artificially inflate views, likes, or engagement metrics.",
];

export const UGC_JOIN_ACKNOWLEDGEMENTS = [
  "Campaign Rules",
  "Platform Rules",
  "Payment Policy",
  "Original Content Policy",
  "Copyright Policy",
  "Privacy Policy",
  "AI Content Policy",
  "FTC Disclosure",
];

export const COMMUNITY_ENCOURAGED = [
  "Authentic content that genuinely reflects your experience with products or campaigns.",
  "Transparent disclosure of affiliate relationships and sponsored content.",
  "Constructive and respectful engagement with other community members.",
  "Supporting fellow creators — sharing knowledge, tips, and opportunities.",
  "Honest reviews, realistic earnings examples, and factual product claims.",
];

export const COMMUNITY_PROHIBITED_ROWS: TableRow[] = [
  { col1: "Hate Speech", col2: "Content attacking individuals based on race, ethnicity, religion, gender, sexual orientation, or disability.", col3: "Suspension / Ban" },
  { col1: "Fake Earnings", col2: "Fabricated earnings screenshots, manipulated dashboards, or misleading income claims.", col3: "Suspension / Ban" },
  { col1: "Impersonation", col2: "Pretending to be another creator, brand, celebrity, or Jimvio employee.", col3: "Strike / Suspension" },
  { col1: "Illegal Products", col2: "Promoting, listing, or linking to products or services illegal in any jurisdiction.", col3: "Suspension / Ban" },
  { col1: "Harmful Spam", col2: "Mass-sending promotional messages, unsolicited DMs, or low-quality content to inflate metrics.", col3: "Warning / Strike" },
  { col1: "Misinformation", col2: "Spreading false claims about products, earnings potential, or platform capabilities.", col3: "Warning / Strike" },
  { col1: "Harassment & Bullying", col2: "Targeting, threatening, or persistently harassing other users in any form.", col3: "Suspension / Ban" },
  { col1: "Adult Content", col2: "Sharing sexual, graphic, or age-restricted content on the platform.", col3: "Permanent Ban" },
  { col1: "Privacy Violations", col2: "Sharing personal information of others without consent (doxxing).", col3: "Permanent Ban" },
  { col1: "Fake Reviews", col2: "Posting fake product reviews or coordinating review manipulation campaigns.", col3: "Strike / Suspension" },
];

export const ENFORCEMENT_ROWS: TableRow[] = [
  { col1: "Warning", col2: "Notification + content removal", col3: "First minor violation" },
  { col1: "Strike", col2: "Temporary restriction on posting", col3: "Repeat minor violations" },
  { col1: "Suspension", col2: "Account locked for 7–30 days", col3: "Serious violations" },
  { col1: "Permanent Ban", col2: "Account permanently terminated", col3: "Severe or repeated violations" },
];

export const PROHIBITED_PRODUCTS = {
  illegal: [
    "Controlled substances, narcotics, or paraphernalia.",
    "Weapons, firearms, or ammunition (where prohibited by law).",
    "Counterfeit goods, fake currency, or forged documents.",
    "Stolen property or goods obtained through illegal means.",
    "Items violating international trade sanctions or embargoes.",
  ],
  harmful: [
    "Products that pose a risk to user health and safety without proper certification.",
    "Unregulated dietary supplements making false medical claims.",
    "Dangerous chemicals, toxins, or explosive materials.",
    "Devices designed to intercept communications or surveillance without consent.",
  ],
  adult: [
    "Adult content, pornographic material, or explicit services.",
    "Alcohol, tobacco, and vaping products (requires age verification & local compliance).",
    "Gambling services, betting tools, or lottery schemes.",
  ],
  digitalFraud: [
    "Get-rich-quick schemes, pyramid schemes, or Ponzi structures.",
    "Fake social media followers, fake reviews, or engagement bots.",
    "Hacking tools, malware, spyware, or exploit kits.",
    "Phishing kits, credential theft tools, or impersonation services.",
    "AI-generated fake identity documents or verification bypasses.",
  ],
  ip: [
    "Counterfeit branded goods (fake designer items, unauthorized replicas).",
    "Pirated software, cracked applications, or unauthorized digital content.",
    "Unauthorized use of copyrighted music, film, or written content.",
    "NFT scams or fraudulent digital asset offerings.",
  ],
  jurisdictional: [
    "Medical devices without required regulatory approvals.",
    "Financial products without proper licensing (unlicensed investment advice).",
    "Services that vary in legality across jurisdictions — sellers are responsible for compliance.",
  ],
};

export const REFUND_ROWS: TableRow4[] = [
  { col1: "Digital Products", col2: "72 hours", col3: "If file is defective or not as described", col4: "" },
  { col1: "Physical Products", col2: "30 days", col3: "If damaged, incorrect, or not delivered", col4: "" },
  { col1: "Subscriptions", col2: "24 hours", col3: "After first billing only — no refund on renewals", col4: "" },
  { col1: "Campaign Earnings", col2: "Non-refundable", col3: "Once content is approved and paid", col4: "" },
];

// T-4: generated from the enforced wallet/affiliate rules.
export const PAYOUT_POLICY_ITEMS = payoutPolicyItems();

export const DATA_COLLECTION_ROWS: TableRow[] = [
  { col1: "Account Data", col2: "Name, email, username, password", col3: "Authentication" },
  { col1: "Profile Data", col2: "Bio, photo, country, social handles", col3: "Public creator profile" },
  { col1: "Financial Data", col2: "Payout details, transaction history", col3: "Payments & payouts" },
  { col1: "Usage Data", col2: "Pages visited, clicks, session duration", col3: "Analytics & improvement" },
  { col1: "Content Data", col2: "Posts, campaign submissions, listings", col3: "Platform functionality" },
  { col1: "Support Data", col2: "Tickets, messages, feedback", col3: "Customer support" },
  { col1: "Cookie & Tracking", col2: "Session cookies, analytics cookies, preference data", col3: "UX optimization" },
  {
    col1: "Commerce / Shopify store data",
    col2: "Shop domain, product catalog metadata, inventory levels, order identifiers, shipping addresses needed for fulfillment, tracking numbers",
    col3: "Jimvio Commerce OS: sync products, inventory, orders, and fulfillment with connected Shopify stores",
  },
];

export const DATA_SHARING_ROWS: TableRow[] = [
  { col1: "Payment Processors", col2: "Execute transactions and payouts", col3: "Financial data only" },
  { col1: "Analytics Providers", col2: "Understand platform usage", col3: "Anonymized usage data" },
  { col1: "Cloud Infrastructure", col2: "Host platform data securely", col3: "Encrypted storage" },
  {
    col1: "Shopify (connected stores)",
    col2: "Authorize store connection; exchange order/product/inventory/fulfillment data via Shopify Admin APIs and webhooks",
    col3: "Only data required to operate Jimvio Commerce for that merchant’s connected store",
  },
  {
    col1: "Fulfillment suppliers (e.g. Jimvio Store)",
    col2: "Route and fulfill merchant orders when the merchant enables supplier integration",
    col3: "Order line items, shipping destination, and tracking as needed for fulfillment",
  },
  { col1: "Legal Authorities", col2: "Comply with lawful requests", col3: "As required by law" },
];

export const PRIVACY_RIGHTS: RightCard[] = [
  { title: "Right to Access", description: "Request a complete copy of all personal data we hold about you." },
  { title: "Right to Rectification", description: "Correct any inaccurate or incomplete information in your profile." },
  { title: "Right to Erasure", description: "Request full deletion of your account and all associated data." },
  { title: "Right to Portability", description: "Export your data in a machine-readable format (JSON/CSV) anytime." },
  { title: "Right to Object", description: "Opt out of marketing or non-essential data processing instantly." },
  { title: "Right to Restrict Processing", description: "Limit how we use your data during disputes or active verification." },
  { title: "Right to Withdraw Consent", description: "Revoke consent for non-essential data processing at any time." },
];

export const PRIVACY_USE_ITEMS = [
  "Create and manage your account and platform access.",
  "Process transactions, calculate commissions, and execute payouts reliably.",
  "Verify creator and seller identity and prevent fraud and abuse.",
  "Display relevant products, campaigns, and community recommendations.",
  "Send transactional emails: account activity alerts, payout confirmations.",
  "Send marketing communications — only with your explicit consent.",
  "Analyze platform performance and continuously improve user experience.",
  "Comply with legal obligations and respond to lawful law enforcement requests.",
  "Detect and prevent violations of our Terms of Service.",
];

export const SECURITY_ITEMS = [
  "All data transmitted via TLS/SSL encryption — never in plaintext.",
  "Passwords hashed with industry-standard bcrypt/Argon2 algorithms.",
  "Payment details tokenized — never stored in plaintext on our systems.",
  "Ongoing security audits and penetration testing by independent specialists.",
  "Personal data accessible only to authorized personnel on a need-to-know basis.",
  "Dedicated breach response team with documented incident response protocol.",
];

export const PROHIBITED_CONDUCT_ITEMS = [
  "Engaging in scams, fraud, deceptive practices, or any form of financial dishonesty.",
  "Sending spam, unsolicited messages, or mass promotional communications.",
  "Generating fake traffic, artificial clicks, bot activity, or fraudulent affiliate conversions.",
  "Creating misleading promotions, fabricated earnings screenshots, or false income claims.",
  "Infringing on intellectual property rights of any third party.",
  "Selling counterfeit, illegal, stolen, or prohibited products on the marketplace.",
  "Impersonating any person, brand, celebrity, or Jimvio representative.",
  "Attempting to hack, reverse-engineer, scrape, or disrupt the platform.",
  "Using the platform to facilitate money laundering or illegal financial activity.",
  "Posting hate speech, discriminatory content, or content that promotes violence.",
  "Sharing adult content, explicit material, or any content involving minors.",
  "Engaging in harassment, bullying, or targeted abuse of any community member.",
];

export const DMCA_REQUIRED_FIELDS = [
  "Your full legal name and contact information.",
  "A description of the copyrighted work you claim has been infringed.",
  "The URL or location of the allegedly infringing content on Jimvio.",
  "A statement that you have a good faith belief the use is not authorized.",
  "A statement, under penalty of perjury, that the information is accurate.",
  "Your physical or electronic signature.",
];

export const COOKIE_CARDS: CookieCard[] = [
  {
    name: "Session Cookies",
    required: true,
    description:
      "Maintain your login state while you navigate the platform. Essential for authentication and core functionality.",
    duration: "Session end",
    optOut: "Cannot be disabled — essential",
  },
  {
    name: "Security Cookies",
    required: true,
    description:
      "Support account protection, fraud detection, and secure session handling. Essential for safe platform use.",
    duration: "Session end",
    optOut: "Cannot be disabled — essential",
  },
  {
    name: "Preference Cookies",
    required: false,
    description:
      "May remember display settings, language preferences, and other platform customizations when those features store preferences locally.",
    duration: "Up to 1 year",
    optOut: "Limit via browser site-data / cookie controls",
  },
  {
    name: "Analytics (1st party)",
    required: false,
    description:
      "May be used to understand how creators and sellers use Jimvio so product experience can be improved over time.",
    duration: "Up to 2 years",
    optOut: "Limit via browser site-data / cookie controls",
  },
  {
    name: "Analytics (3rd party)",
    required: false,
    description:
      "External analytics or traffic tools, when enabled, may help Jimvio understand visit sources. Governed by the provider’s privacy terms.",
    duration: "Provider-dependent",
    optOut: "Limit via browser controls; provider opt-outs where available",
  },
  {
    name: "Marketing / Attribution",
    required: false,
    description:
      "May support promotions, campaign relevance, or affiliate attribution (including referral cookies set when you use tracking links).",
    duration: "Provider / feature dependent",
    optOut: "Limit via browser controls; clear site data to remove referral cookies",
  },
];

export const ADVERTISING_STANDARDS = [
  "All ads and promotional content must be truthful and non-deceptive.",
  "Ads must be clearly labeled as 'Sponsored' or 'Ad' where applicable.",
  "No bait-and-switch advertising — the advertised offer must be the actual offer.",
  "Comparative advertising must be factually accurate and not disparaging.",
  "Ads targeting minors are prohibited.",
  "Ads for prohibited products (per Prohibited Products policy) are not permitted.",
  "Political advertising requires pre-approval and enhanced verification.",
];

export const CREATOR_DISCLOSURE_ITEMS = [
  "Clearly disclose any material connection to a brand per FTC guidelines.",
  "Acceptable disclosures: #ad, #sponsored, #partner, or 'Paid partnership with [Brand]'.",
  "Disclosures must be prominent and not buried in hashtags or fine print.",
];

export const SHOPIFY_COMMERCE_ITEMS = [
  "We request only Shopify Admin scopes required for live Jimvio Commerce features.",
  "Order and customer contact fields used for fulfillment may include name, email, phone, and shipping address.",
  "Shopify mandatory compliance webhooks (customers/data_request, customers/redact, shop/redact) are processed with HMAC verification.",
  "Merchants can disconnect a store in Jimvio Commerce; uninstalling the app from Shopify also clears stored access tokens.",
  "Privacy requests: info@jimvio.com.",
];

export const ELIGIBILITY_ITEMS = [
  "Be at least 18 years of age, or the age of majority in your jurisdiction.",
  "Have the legal capacity to enter into a binding contract under applicable law.",
  "Not be prohibited from using the platform under any local or international law.",
  "Provide accurate, complete, and up-to-date registration information at all times.",
  "Maintain the security and confidentiality of your account credentials.",
];
