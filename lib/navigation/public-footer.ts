/**
 * Public site footer destinations.
 * Company links stay in this order. Press & Media opens the Jimvio Media page.
 */

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: "Marketplace" | "Earn & Grow" | "Resources" | "Company";
  links: readonly FooterLink[];
};

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: "Marketplace",
    links: [
      { label: "Browse Products", href: "/marketplace" },
      { label: "Collections", href: "/marketplace/collections" },
      { label: "New Arrivals", href: "/marketplace/collections/new-arrivals" },
      { label: "Digital Products", href: "/marketplace/digital" },
      { label: "Buyer Protection", href: "/protection" },
    ],
  },
  {
    title: "Earn & Grow",
    links: [
      { label: "Affiliate Program", href: "/affiliates" },
      { label: "Creator Monetization", href: "/monetization" },
      { label: "Founding Creators", href: "/founding-creators" },
      { label: "UGC & Clipping", href: "/ugc" },
      { label: "Earnings & Payouts", href: "/wallet" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Getting Started", href: "/getting-started" },
      { label: "Safety Center", href: "/safety" },
      { label: "API Docs", href: "/docs" },
      { label: "Pricing & Fees", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press & Media", href: "/media" },
      { label: "Legal Center", href: "/legal" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export type FooterUtilityLink = FooterLink & { external?: boolean };

export function getFooterUtilityLinks(
  statusUrl = process.env.STATUS_WEBSITE_URL || "https://status.jimvio.com",
): FooterUtilityLink[] {
  return [
    { label: "Status", href: statusUrl, external: true },
    { label: "Legal", href: "/legal" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "About Us", href: "/about" },
    { label: "Cookies", href: "/cookies" },
  ];
}
