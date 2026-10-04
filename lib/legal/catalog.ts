import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Shield,
  Cookie,
  ShoppingBag,
  Store,
  Wallet,
  Clapperboard,
  HardDrive,
  Plug,
  Code2,
  Users,
  Ban,
  Copyright,
  RefreshCcw,
  Baby,
  Scale,
  Megaphone,
  Handshake,
} from "lucide-react";
import { PLATFORM_STATS } from "@/lib/platform-stats";

export type LegalCategoryId =
  | "general"
  | "marketplace"
  | "creators"
  | "communities"
  | "payments"
  | "platform";

export type LegalDocumentId =
  | "terms"
  | "privacy"
  | "cookies"
  | "buyer-terms"
  | "seller-terms"
  | "earnings"
  | "ugc-clipping"
  | "digital-products"
  | "wallet"
  | "commerce-integrations"
  | "developer"
  | "community-guidelines"
  | "prohibited-products"
  | "copyright-ip"
  | "refunds-disputes"
  | "youth-safety"
  | "affiliate-terms"
  | "advertising-disclosure";

export type LegalSection = {
  id: string;
  title: string;
};

export type LegalDocument = {
  id: LegalDocumentId;
  slug: string;
  href: string;
  title: string;
  shortTitle?: string;
  subtitle: string;
  description: string;
  category: LegalCategoryId;
  icon: LucideIcon;
  keywords: string[];
  lastUpdated: string;
  version?: string;
  featured?: boolean;
  sections: LegalSection[];
  takeaways?: string[];
  related?: LegalDocumentId[];
  /** Documents that consolidate content already published elsewhere */
  consolidatesInto?: LegalDocumentId;
  /** Consolidated / product-derived pages awaiting counsel sign-off */
  requiresReview?: boolean;
};

export type LegalCategory = {
  id: LegalCategoryId;
  label: string;
};

export const LEGAL_EFFECTIVE_DATE = "May 06, 2026";
export const LEGAL_VERSION = "1.0";
export const LEGAL_COUNTRIES = PLATFORM_STATS.countries;

export const LEGAL_CATEGORIES: LegalCategory[] = [
  { id: "general", label: "General policies" },
  { id: "marketplace", label: "Marketplace & commerce" },
  { id: "creators", label: "Creators & affiliates" },
  { id: "communities", label: "Communities & safety" },
  { id: "payments", label: "Payments & earnings" },
  { id: "platform", label: "Platform & integrations" },
];

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: "terms",
    slug: "terms",
    href: "/terms",
    title: "Terms of Service",
    subtitle: "General platform terms and conditions.",
    description:
      "Clear rules. Fair usage. A safer creator commerce ecosystem for everyone, everywhere.",
    category: "general",
    icon: FileText,
    keywords: ["terms", "tos", "agreement", "eligibility", "account", "liability"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    featured: true,
    sections: [
      { id: "agreement", title: "Agreement" },
      { id: "eligibility", title: "Eligibility" },
      { id: "account-security", title: "Account Security" },
      { id: "prohibited-conduct", title: "Prohibited Conduct" },
      { id: "intellectual-property", title: "Intellectual Property" },
      { id: "limitation-of-liability", title: "Limitation of Liability" },
      { id: "governing-law", title: "Governing Law & Disputes" },
      { id: "seller-creator", title: "Seller & Creator Rules" },
      { id: "affiliate-program", title: "Affiliate Program" },
    ],
    takeaways: [
      "Be at least 18 years old",
      "Use the platform responsibly",
      "No scams or fake traffic",
      "Respect intellectual property",
    ],
    related: ["privacy", "community-guidelines", "prohibited-products"],
  },
  {
    id: "privacy",
    slug: "privacy",
    href: "/privacy",
    title: "Privacy Policy",
    subtitle: "How we collect, use and protect your data.",
    description:
      "How Jimvio collects, uses, shares, and protects personal data across the platform and connected commerce tools.",
    category: "general",
    icon: Shield,
    keywords: ["privacy", "data", "gdpr", "ccpa", "shopify", "retention", "rights"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "commitment", title: "Our Commitment" },
      { id: "information-we-collect", title: "Information We Collect" },
      { id: "how-we-use", title: "How We Use Your Data" },
      { id: "data-sharing", title: "Data Sharing & Third Parties" },
      { id: "privacy-rights", title: "Your Privacy Rights" },
      { id: "data-security", title: "Data Security" },
      { id: "data-retention", title: "Data Retention" },
      { id: "shopify-commerce", title: "Shopify & Jimvio Commerce" },
    ],
    takeaways: [
      "We do not sell personal data",
      "You can request access or deletion",
      "Shopify store data is processed for Commerce features",
      "Contact info@jimvio.com for privacy requests",
    ],
    related: ["cookies", "commerce-integrations", "terms"],
  },
  {
    id: "cookies",
    slug: "cookies",
    href: "/cookies",
    title: "Cookie Policy",
    subtitle: "How we use cookies and similar technologies.",
    description:
      "What cookies Jimvio uses, why they matter, and how you can control non-essential tracking.",
    category: "general",
    icon: Cookie,
    keywords: ["cookies", "tracking", "analytics", "preferences", "consent"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "what-are-cookies", title: "What Are Cookies?" },
      { id: "cookies-we-use", title: "Cookies We Use" },
      { id: "cookie-choices", title: "Your Cookie Choices" },
      { id: "third-party-cookies", title: "Third-Party Cookies" },
      { id: "advertising-standards", title: "Advertising & Creator Disclosure" },
      { id: "copyright-dmca", title: "Copyright & DMCA" },
      { id: "policy-updates", title: "Policy Updates" },
    ],
    related: ["privacy", "advertising-disclosure", "copyright-ip"],
  },
  {
    id: "buyer-terms",
    slug: "buyer-terms",
    href: "/legal/buyer-terms",
    title: "Buyer Terms",
    subtitle: "Terms for buying products on Jimvio.",
    description:
      "Rules for purchasing physical and digital products on Jimvio, including refunds and dispute handling.",
    category: "marketplace",
    icon: ShoppingBag,
    keywords: ["buyer", "purchase", "order", "refund", "delivery"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "overview", title: "Overview" },
      { id: "orders", title: "Orders & Payments" },
      { id: "refunds", title: "Refunds" },
      { id: "disputes", title: "Disputes & Chargebacks" },
      { id: "related", title: "Related Policies" },
    ],
    related: ["refunds-disputes", "terms", "prohibited-products"],
  },
  {
    id: "seller-terms",
    slug: "seller-terms",
    href: "/legal/seller-terms",
    title: "Seller Terms",
    subtitle: "Terms for listing and selling products.",
    description:
      "Seller eligibility, fees, listing standards, and responsibilities for selling on Jimvio.",
    category: "marketplace",
    icon: Store,
    keywords: ["seller", "vendor", "listing", "fees", "fulfillment"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "eligibility", title: "Seller Eligibility" },
      { id: "fees", title: "Fees" },
      { id: "responsibilities", title: "Seller Responsibilities" },
      { id: "prohibited", title: "Prohibited Listings" },
      { id: "related", title: "Related Policies" },
    ],
    related: ["terms", "prohibited-products", "earnings"],
  },
  {
    id: "earnings",
    slug: "earnings",
    href: "/legal/earnings",
    title: "Earnings Terms",
    subtitle: "Payouts, commissions and revenue sharing.",
    description:
      "How Jimvio handles seller, creator, and affiliate earnings, holds, and payouts.",
    category: "payments",
    icon: Wallet,
    keywords: ["earnings", "payout", "commission", "net-30", "withdrawal"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "payouts", title: "Payout Policy" },
      { id: "affiliates", title: "Affiliate Commissions" },
      { id: "campaigns", title: "Campaign Earnings" },
      { id: "holds", title: "Holds & Reviews" },
    ],
    related: ["wallet", "affiliate-terms", "refunds-disputes"],
  },
  {
    id: "ugc-clipping",
    slug: "ugc-clipping",
    href: "/legal/ugc-clipping",
    title: "UGC & Clipping Terms",
    subtitle: "Rules for campaigns, UGC and content creation.",
    description:
      "Creator obligations, payment models, originality, AI use, and disclosure rules for UGC and clipping campaigns.",
    category: "creators",
    icon: Clapperboard,
    keywords: ["ugc", "clipping", "campaign", "creator", "ftc", "ai"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "overview", title: "Overview" },
      { id: "payment-models", title: "Payment Models" },
      { id: "creator-obligations", title: "Creator Obligations" },
      { id: "join-acknowledgements", title: "Join Acknowledgements" },
      { id: "related", title: "Related Policies" },
    ],
    related: ["copyright-ip", "advertising-disclosure", "earnings"],
  },
  {
    id: "digital-products",
    slug: "digital-products",
    href: "/legal/digital-products",
    title: "Digital Products Terms",
    subtitle: "Terms for digital products (courses, e-books, etc.).",
    description:
      "Licensing, delivery, and refund rules for digital goods sold on Jimvio.",
    category: "marketplace",
    icon: HardDrive,
    keywords: ["digital", "download", "license", "course", "ebook"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "overview", title: "Overview" },
      { id: "delivery", title: "Delivery & Access" },
      { id: "refunds", title: "Refunds" },
      { id: "ip", title: "Intellectual Property" },
    ],
    related: ["buyer-terms", "refunds-disputes", "copyright-ip"],
  },
  {
    id: "wallet",
    slug: "wallet",
    href: "/legal/wallet",
    title: "Wallet Terms",
    subtitle: "Using the Jimvio Wallet for payments and payouts.",
    description:
      "How Jimvio Wallet balances, payouts, and account security interact with platform Terms and payout rules.",
    category: "payments",
    icon: Wallet,
    keywords: ["wallet", "balance", "withdrawal", "payout", "escrow"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "overview", title: "Overview" },
      { id: "use", title: "Permitted Use" },
      { id: "payouts", title: "Withdrawals & Payouts" },
      { id: "security", title: "Account Security" },
      { id: "limitations", title: "Limitations" },
    ],
    related: ["earnings", "terms", "privacy"],
    requiresReview: true,
  },
  {
    id: "commerce-integrations",
    slug: "commerce-integrations",
    href: "/legal/commerce-integrations",
    title: "Commerce & Integrations",
    subtitle: "Shopify, product sync, orders and fulfillment.",
    description:
      "How Jimvio Commerce processes connected-store data, sync, orders, and supplier fulfillment.",
    category: "platform",
    icon: Plug,
    keywords: ["shopify", "commerce", "integration", "fulfillment", "webhooks"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "overview", title: "Overview" },
      { id: "shopify", title: "Shopify Connection" },
      { id: "data", title: "Data Processed" },
      { id: "fulfillment", title: "Fulfillment Suppliers" },
      { id: "disconnect", title: "Disconnect & Deletion" },
    ],
    related: ["privacy", "seller-terms"],
  },
  {
    id: "developer",
    slug: "developer",
    href: "/legal/developer",
    title: "Developer Terms",
    subtitle: "API access, integrations and platform development.",
    description:
      "Rules for using Jimvio APIs and developer integrations under the platform Terms of Service.",
    category: "platform",
    icon: Code2,
    keywords: ["api", "developer", "integration", "keys", "rate"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "overview", title: "Overview" },
      { id: "access", title: "Access & Credentials" },
      { id: "acceptable-use", title: "Acceptable Use" },
      { id: "termination", title: "Suspension & Termination" },
    ],
    related: ["terms", "privacy"],
    requiresReview: true,
  },
  {
    id: "community-guidelines",
    slug: "community-guidelines",
    href: "/community-guidelines",
    title: "Community Guidelines",
    subtitle: "Rules for a safe and respectful community.",
    description:
      "What Jimvio encourages, what is prohibited, and how moderation and enforcement work.",
    category: "communities",
    icon: Users,
    keywords: ["community", "moderation", "safety", "guidelines", "enforcement"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "encouraged", title: "What We Encourage" },
      { id: "prohibited", title: "Strictly Prohibited" },
      { id: "enforcement", title: "Enforcement Levels" },
    ],
    related: ["youth-safety", "terms", "prohibited-products"],
  },
  {
    id: "prohibited-products",
    slug: "prohibited-products",
    href: "/prohibited-products",
    title: "Prohibited Products & Services",
    subtitle: "What's not allowed on Jimvio.",
    description:
      "Categories of products and services that may not be listed, promoted, or fulfilled on Jimvio.",
    category: "marketplace",
    icon: Ban,
    keywords: ["prohibited", "banned", "illegal", "restricted", "listings"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "illegal", title: "Illegal Items" },
      { id: "harmful", title: "Harmful & Dangerous Products" },
      { id: "adult", title: "Adult & Restricted Content" },
      { id: "digital-fraud", title: "Digital Fraud & Scams" },
      { id: "ip", title: "Intellectual Property Violations" },
      { id: "jurisdictional", title: "Restricted by Jurisdiction" },
    ],
    related: ["seller-terms", "community-guidelines", "terms"],
  },
  {
    id: "copyright-ip",
    slug: "copyright-ip",
    href: "/legal/copyright-ip",
    title: "Copyright & IP Policy",
    subtitle: "Intellectual property and takedown requests.",
    description:
      "How Jimvio handles copyright complaints, DMCA notices, and intellectual property ownership.",
    category: "general",
    icon: Copyright,
    keywords: ["copyright", "dmca", "ip", "takedown", "infringement"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "ownership", title: "Ownership" },
      { id: "dmca", title: "DMCA Notices" },
      { id: "repeat", title: "Repeat Infringers" },
      { id: "counter", title: "Counter-Notices" },
    ],
    related: ["terms", "ugc-clipping", "cookies"],
  },
  {
    id: "refunds-disputes",
    slug: "refunds-disputes",
    href: "/refunds-payouts",
    title: "Refunds & Disputes",
    shortTitle: "Refunds & Payouts",
    subtitle: "Refund policies and dispute resolution.",
    description:
      "Buyer refund windows, seller and creator payout rules, and chargeback handling.",
    category: "marketplace",
    icon: RefreshCcw,
    keywords: ["refund", "dispute", "chargeback", "payout", "cancellation"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "buyer-refunds", title: "Buyer Refund Policy" },
      { id: "payouts", title: "Seller & Creator Payout Policy" },
      { id: "chargebacks", title: "Chargeback & Dispute Resolution" },
    ],
    related: ["buyer-terms", "earnings", "wallet"],
  },
  {
    id: "youth-safety",
    slug: "youth-safety",
    href: "/legal/youth-safety",
    title: "Youth Safety Policy",
    subtitle: "Our commitment to protecting young users.",
    description:
      "Jimvio’s age requirements and safeguards related to minors and age-restricted content.",
    category: "communities",
    icon: Baby,
    keywords: ["youth", "minors", "age", "safety", "children"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "age", title: "Age Requirements" },
      { id: "content", title: "Age-Restricted Content" },
      { id: "reporting", title: "Reporting Concerns" },
    ],
    related: ["community-guidelines", "terms"],
    requiresReview: true,
  },
  {
    id: "affiliate-terms",
    slug: "affiliate-terms",
    href: "/legal/affiliate-terms",
    title: "Affiliate Program Terms",
    subtitle: "Commission rules and affiliate obligations.",
    description:
      "Affiliate attribution, commission structure, payout timing, and promotional obligations.",
    category: "creators",
    icon: Handshake,
    keywords: ["affiliate", "commission", "attribution", "cookie", "promo"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "overview", title: "Overview" },
      { id: "commissions", title: "Commissions" },
      { id: "obligations", title: "Affiliate Obligations" },
      { id: "payouts", title: "Payouts" },
    ],
    related: ["earnings", "advertising-disclosure", "terms"],
  },
  {
    id: "advertising-disclosure",
    slug: "advertising-disclosure",
    href: "/legal/advertising-disclosure",
    title: "Advertising Disclosure Guidelines",
    subtitle: "Sponsored content and FTC-style disclosures.",
    description:
      "Advertising standards and creator disclosure requirements for promotional content on Jimvio.",
    category: "creators",
    icon: Megaphone,
    keywords: ["advertising", "disclosure", "ftc", "sponsored", "ad"],
    lastUpdated: LEGAL_EFFECTIVE_DATE,
    version: LEGAL_VERSION,
    sections: [
      { id: "standards", title: "Advertising Standards" },
      { id: "disclosures", title: "Creator Disclosures" },
    ],
    related: ["ugc-clipping", "affiliate-terms", "cookies"],
  },
];

export const LEGAL_CONTACT = {
  supportEmail: "support@jimvio.com",
  infoEmail: "info@jimvio.com",
  copyrightEmail: "copyright@jimvio.com",
  safetyEmail: "safety@jimvio.com",
  contactPath: "/contact",
  helpPath: "/help",
} as const;

export function getLegalDocument(idOrSlug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find(
    (doc) => doc.id === idOrSlug || doc.slug === idOrSlug || doc.href === `/${idOrSlug}` || doc.href === idOrSlug,
  );
}

export function getLegalDocumentByHref(href: string): LegalDocument | undefined {
  const normalized = href.split("?")[0].split("#")[0];
  return LEGAL_DOCUMENTS.find((doc) => doc.href === normalized);
}

export function searchLegalDocuments(query: string, category?: LegalCategoryId | "all") {
  const q = query.trim().toLowerCase();
  return LEGAL_DOCUMENTS.filter((doc) => {
    if (category && category !== "all" && doc.category !== category) return false;
    if (!q) return true;
    const haystack = [
      doc.title,
      doc.subtitle,
      doc.description,
      ...doc.keywords,
      doc.category,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getFeaturedLegalDocument(): LegalDocument {
  return LEGAL_DOCUMENTS.find((doc) => doc.featured) ?? LEGAL_DOCUMENTS[0];
}

export function getDocumentsByCategory(category: LegalCategoryId): LegalDocument[] {
  return LEGAL_DOCUMENTS.filter((doc) => doc.category === category);
}

/** Icon alias used by UI that needs a generic legal mark */
export const LegalScaleIcon = Scale;
