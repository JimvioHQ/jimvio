export const SUPPORT_CATEGORIES = [
  {
    id: "account-security",
    title: "Account & Security",
    summary: "Registration, sign-in, verification, profile settings, and account protection.",
    href: "/help/topics/account-security",
  },
  {
    id: "payments",
    title: "Payments & Payouts",
    summary: "Checkout methods, wallet balances, transaction history, and withdrawal requests.",
    href: "/help/topics/payments",
  },
  {
    id: "marketplace",
    title: "Marketplace",
    summary: "Browsing, product pages, carts, checkout, and buying on Jimvio.",
    href: "/help/topics/marketplace",
  },
  {
    id: "selling",
    title: "Selling & Seller Management",
    summary: "Seller profiles, listings, inventory, orders, and seller earnings.",
    href: "/help/topics/selling",
  },
  {
    id: "dropshipping",
    title: "Dropshipping",
    summary: "Supplier products, imports, pricing, stock sync, and supplier fulfillment.",
    href: "/help/topics/dropshipping",
  },
  {
    id: "affiliate",
    title: "Affiliate Marketing",
    summary: "Tracked links, commissions, clicks, and affiliate wallet earnings.",
    href: "/help/topics/affiliate",
  },
  {
    id: "creators",
    title: "Creators & Content",
    summary: "Creator profiles, opportunities, submissions, and creator earnings.",
    href: "/help/topics/creators",
  },
  {
    id: "ugc",
    title: "UGC & Clipping",
    summary: "Original content campaigns, clipping briefs, reviews, and approvals.",
    href: "/help/topics/ugc",
  },
  {
    id: "campaigns",
    title: "Brand Campaigns",
    summary: "Campaign briefs, budgets, creator review, and campaign payments.",
    href: "/help/topics/campaigns",
  },
  {
    id: "communities",
    title: "Communities",
    summary: "Creating communities, roles, posts, events, courses, and memberships.",
    href: "/help/topics/communities",
  },
  {
    id: "live",
    title: "Live Streaming",
    summary: "Going live, devices, co-hosts, chat, and live product links.",
    href: "/help/topics/live",
  },
  {
    id: "digital",
    title: "Digital Products",
    summary: "Digital listings, delivery after payment, courses, and recurring access.",
    href: "/help/topics/digital",
  },
  {
    id: "orders",
    title: "Orders & Shipping",
    summary: "Order status, tracking numbers, delays, returns, and cancellations.",
    href: "/help/topics/orders",
  },
  {
    id: "ai",
    title: "AI Tools",
    summary: "Jimvio AI assistants that are actually available, and how to review their output.",
    href: "/help/topics/ai",
  },
  {
    id: "technical",
    title: "Technical Support",
    summary: "Page, upload, login, and bug-report troubleshooting.",
    href: "/help/topics/technical",
  },
] as const;

export type SupportCategoryId = (typeof SUPPORT_CATEGORIES)[number]["id"];

export type SupportArticle = {
  slug: string;
  category: SupportCategoryId;
  title: string;
  lead: string;
  steps: string[];
  eligibility: string;
  troubleshooting: string[];
  next: string;
  tags: string[];
  updated: string;
  related: string[];
};

export type SupportSearchHit = {
  slug: string;
  title: string;
  category: SupportCategoryId;
  categoryTitle: string;
  excerpt: string;
  href: string;
  score: number;
};

export const SUGGESTED_SEARCHES = [
  "How do I withdraw my earnings?",
  "How do I track my order?",
  "How do I create a campaign?",
  "How do I create an affiliate link?",
  "How do I import products?",
  "How do I go live?",
  "How do I download a digital product?",
  "How do I secure my account?",
] as const;

export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "normal", "high"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const ISSUE_TYPES = [
  "question",
  "problem",
  "billing",
  "order",
  "account",
  "bug",
  "feature",
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

export const STATUS_EXPLANATIONS: Record<TicketStatus, string> = {
  open: "Received. Support has not started this ticket yet.",
  in_progress: "Support is working on this ticket.",
  waiting_for_customer: "Support needs more information from you before it can continue.",
  resolved: "A resolution was recorded. Reply if the issue is not actually fixed.",
  closed: "This ticket is closed. Reply if the issue returns and it will be reopened.",
};
