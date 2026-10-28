import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Clapperboard,
  Compass,
  Eye,
  Globe2,
  Handshake,
  Heart,
  Landmark,
  Layers,
  LayoutGrid,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Palette,
  Radio,
  Scale,
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Type,
  Users,
  Wallet,
  Wand2,
} from "lucide-react";
import { PUBLIC_ECOSYSTEM } from "@/lib/brand/positioning";

export const ABOUT_ORANGE = "#FF5A1F";
export const ABOUT_INK = "#111827";
export const ABOUT_WHITE = "#FFFFFF";
export const ABOUT_BG = "#F8FAFC";

export type AboutSectionId =
  | "introduction"
  | "mission"
  | "what-is-jimvio"
  | "origin"
  | "audience"
  | "ecosystem"
  | "positioning"
  | "promise"
  | "personality"
  | "values"
  | "differentiation"
  | "logo"
  | "colors"
  | "typography"
  | "visual"
  | "voice"
  | "platform"
  | "social"
  | "assets"
  | "governance"
  | "team";

export type AboutNavItem = {
  id: AboutSectionId;
  label: string;
  href: string;
  icon?: LucideIcon;
};

export type AboutNavGroup = {
  id: string;
  label: string;
  defaultOpen?: boolean;
  items: AboutNavItem[];
};

export const ABOUT_NAV: AboutNavGroup[] = [
  {
    id: "about-jimvio",
    label: "About Jimvio",
    defaultOpen: true,
    items: [
      { id: "introduction", label: "Introduction", href: "#introduction", icon: BookOpen },
      { id: "mission", label: "Mission", href: "#mission", icon: Compass },
      { id: "what-is-jimvio", label: "What is Jimvio?", href: "#what-is-jimvio", icon: LayoutGrid },
      { id: "origin", label: "Origin", href: "#origin", icon: Lightbulb },
      { id: "audience", label: "Who are we building for?", href: "#audience", icon: Users },
      { id: "ecosystem", label: "Our Ecosystem", href: "#ecosystem", icon: Layers },
    ],
  },
  {
    id: "brand-strategy",
    label: "Brand Strategy",
    items: [
      { id: "positioning", label: "Positioning", href: "#positioning", icon: Target },
      { id: "promise", label: "Brand Promise", href: "#promise", icon: Heart },
      { id: "personality", label: "Brand Personality", href: "#personality", icon: Sparkles },
      { id: "values", label: "Brand Values", href: "#values", icon: Shield },
      { id: "audience", label: "Audience", href: "#audience", icon: Users },
      { id: "differentiation", label: "Differentiation", href: "#differentiation", icon: Eye },
    ],
  },
  {
    id: "logo",
    label: "Logo",
    items: [
      { id: "logo", label: "Brandmark", href: "#logo", icon: Landmark },
      { id: "logo", label: "Lockup", href: "#logo" },
      { id: "colors", label: "Color", href: "#colors", icon: Palette },
      { id: "logo", label: "Avatars", href: "#logo" },
      { id: "logo", label: "Logo Clearance", href: "#logo" },
      { id: "logo", label: "Logo Misuse", href: "#logo" },
    ],
  },
  {
    id: "colors",
    label: "Colors",
    items: [
      { id: "colors", label: "Primary Palette", href: "#colors", icon: Palette },
      { id: "colors", label: "Supporting Colors", href: "#colors" },
      { id: "colors", label: "Backgrounds", href: "#colors" },
      { id: "colors", label: "Usage Guidelines", href: "#colors" },
    ],
  },
  {
    id: "typography",
    label: "Typography",
    items: [
      { id: "typography", label: "Font Family", href: "#typography", icon: Type },
      { id: "typography", label: "Type Scale", href: "#typography" },
      { id: "typography", label: "Heading Styles", href: "#typography" },
      { id: "typography", label: "Body Text", href: "#typography" },
      { id: "typography", label: "Accessibility", href: "#typography" },
    ],
  },
  {
    id: "visual",
    label: "Visual Identity",
    items: [
      { id: "visual", label: "Imagery", href: "#visual", icon: Eye },
      { id: "visual", label: "Illustration Style", href: "#visual" },
      { id: "visual", label: "Iconography", href: "#visual" },
      { id: "visual", label: "UI Components", href: "#visual" },
    ],
  },
  {
    id: "voice",
    label: "Voice & Messaging",
    items: [
      { id: "voice", label: "Brand Voice", href: "#voice", icon: MessageSquare },
      { id: "voice", label: "Writing Principles", href: "#voice" },
      { id: "voice", label: "Messaging", href: "#voice" },
      { id: "voice", label: "Approved Taglines", href: "#voice" },
    ],
  },
  {
    id: "platform",
    label: "Product & Ecosystem",
    items: [
      { id: "platform", label: "Marketplace", href: "#platform", icon: ShoppingBag },
      { id: "platform", label: "Communities", href: "#platform", icon: Users },
      { id: "platform", label: "Commerce", href: "#platform", icon: Store },
      { id: "platform", label: "Affiliates", href: "#platform", icon: Handshake },
      { id: "platform", label: "UGC & Clipping", href: "#platform", icon: Clapperboard },
      { id: "platform", label: "Digital Products", href: "#platform", icon: BookOpen },
      { id: "platform", label: "Creator Monetization", href: "#platform", icon: Sparkles },
      { id: "platform", label: "Wallet & Payouts", href: "#platform", icon: Wallet },
      { id: "platform", label: "Live Commerce", href: "#platform", icon: Radio },
      { id: "platform", label: "Cross-Border Commerce", href: "#platform", icon: Globe2 },
      { id: "platform", label: "AI & Intelligence", href: "#platform", icon: Wand2 },
    ],
  },
  {
    id: "social",
    label: "Social & Marketing",
    items: [
      { id: "social", label: "Social Identity", href: "#social", icon: Megaphone },
      { id: "social", label: "Content Principles", href: "#social" },
      { id: "social", label: "Campaign Guidelines", href: "#social" },
    ],
  },
  {
    id: "assets",
    label: "Brand Assets",
    items: [
      { id: "assets", label: "Official Logo", href: "#assets", icon: Briefcase },
      { id: "assets", label: "Approved Assets", href: "#assets" },
      { id: "assets", label: "Downloadable Resources", href: "#assets" },
    ],
  },
  {
    id: "governance",
    label: "Brand Governance",
    items: [
      { id: "governance", label: "Usage Permissions", href: "#governance", icon: Scale },
      { id: "governance", label: "Intellectual Property", href: "#governance" },
      { id: "governance", label: "Brand Contact", href: "#governance" },
      { id: "governance", label: "Legal Center", href: "/legal", icon: Scale },
      { id: "team", label: "The Team", href: "#team", icon: Users },
    ],
  },
];

export const ABOUT_QUICK_LINKS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "#mission", label: "Our Mission", icon: Compass },
  { href: "#what-is-jimvio", label: "What is Jimvio?", icon: LayoutGrid },
  { href: "#origin", label: "Our Origin", icon: Lightbulb },
  { href: "#audience", label: "Who we are building for", icon: Users },
  { href: "#ecosystem", label: "Our Ecosystem", icon: Layers },
];

const ABOUT_FEATURE_ICONS: Record<string, LucideIcon> = {
  marketplace: ShoppingBag,
  communities: Users,
  affiliates: Handshake,
  ugc: Clapperboard,
  seller: Store,
  digital: BookOpen,
  dropshipping: Layers,
  collaborations: Target,
  live: Radio,
  monetization: Sparkles,
  payments: Wallet,
  ai: Wand2,
  global: Globe2,
  growth: BarChart3,
};

export const ABOUT_FEATURES: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = PUBLIC_ECOSYSTEM.map((item) => ({
  title: item.title,
  description: item.description,
  href: item.href,
  icon: ABOUT_FEATURE_ICONS[item.id] ?? LayoutGrid,
}));

export const ABOUT_AUDIENCES = [
  {
    title: "Creators and publishers",
    body: "Submit campaigns, grow an audience, and monetize content without needing a massive following on day one.",
  },
  {
    title: "Affiliates and marketers",
    body: "Share tracking links, disclose partnerships clearly, and earn commissions when a sale is attributed.",
  },
  {
    title: "Sellers and entrepreneurs",
    body: "List products, manage orders, and reach buyers through the Jimvio marketplace and store tools.",
  },
  {
    title: "Brands and businesses",
    body: "Launch creator campaigns, collaborate with affiliates, and connect store operations through Commerce.",
  },
  {
    title: "Digital product makers",
    body: "Sell courses, templates, and downloads with the digital-goods flows already live on Jimvio.",
  },
  {
    title: "Community builders",
    body: "Host spaces, events, and conversations for people who buy, sell, and create together.",
  },
  {
    title: "Buyers and customers",
    body: "Shop products, use checkout, and rely on published refund and protection policies.",
  },
];

export const ABOUT_ECOSYSTEM = [
  { title: "Discover", body: "Browse marketplace products, campaigns, and communities." },
  { title: "Create", body: "Publish content, storefronts, listings, and brand briefs." },
  { title: "Sell", body: "Take orders through Jimvio checkout and Commerce tools." },
  { title: "Connect", body: "Join communities, message members, and collaborate with brands on supported campaigns." },
  { title: "Monetize", body: "Track sales, affiliate commissions, campaign payouts, and wallet balances. Income is not guaranteed." },
  { title: "Grow", body: "Use communities, analytics, and supported payouts. Availability varies by country." },
];

export const ABOUT_VALUES = [
  {
    title: "Borderless by Design",
    body: "Opportunities should have no borders. Jimvio was built so a creator in Kigali, Lagos, or Jakarta can earn without being an afterthought.",
  },
  {
    title: "Radical Transparency",
    body: "Clicks, sales, and views are tracked in real time. Dashboards are meant to put creators in control of earnings — not hide them.",
  },
  {
    title: "Trust at Every Layer",
    body: "Verified vendors, careful data handling, encrypted transactions, and Trust & Safety reporting keep the marketplace usable.",
  },
  {
    title: "Creator-First Thinking",
    body: "Every feature is judged by one question from Jimvio’s founding docs: does this help creators earn more?",
  },
  {
    title: "Accessible Innovation",
    body: "Free to start, no credit card required to join, and tools that work from a phone — not only from a well-funded studio.",
  },
  {
    title: "Continuous Improvement",
    body: "We ship based on what users need: clearer rules, better payouts, and fewer barriers between an idea and an opportunity.",
  },
];

export const ABOUT_COMMITMENTS = [
  "Transparent platform rules.",
  "Useful tools for creators and sellers.",
  "International reach, with shipping, checkout, and payouts that vary by country.",
  "Respect for trust, privacy, and account security.",
  "Continuous improvement based on user needs.",
];

export const ABOUT_TIMELINE = [
  {
    label: "2023",
    title: "The Idea",
    body: "Jimvio was founded to make earning online possible without gatekeepers, blocked payment methods, or a requirement for millions of followers.",
  },
  {
    label: "Building",
    title: "Early Development",
    body: "The core platform came together: marketplace, accounts, and the first tools for selling and promoting on one login.",
  },
  {
    label: "Community",
    title: "Growing Community",
    body: "Creators, sellers, and brands started using campaigns, affiliates, and communities alongside commerce.",
  },
  {
    label: "Today",
    title: "Expanding Ecosystem",
    body: "Jimvio connects marketplace commerce, seller tools, dropshipping, affiliates, UGC, communities, live sessions, wallet payouts, and AI assistance in one product. Availability varies.",
  },
  {
    label: "Next",
    title: "The Next Chapter",
    body: "We keep removing barriers between ideas, audiences, and income — without promising outcomes we cannot control.",
  },
];

export const ABOUT_COLORS = [
  { name: "Jimvio Orange", hex: ABOUT_ORANGE, usage: "Primary accent, CTAs, emphasis" },
  { name: "Ink", hex: ABOUT_INK, usage: "Headlines and primary text" },
  { name: "White", hex: ABOUT_WHITE, usage: "Surfaces and cards" },
  { name: "Canvas", hex: ABOUT_BG, usage: "Page background" },
];

export const LOGO_MISUSE = [
  "Do not stretch, rotate, or distort the mark.",
  "Do not recolor the mark outside approved orange, white, or ink treatments.",
  "Do not add drop shadows, outlines, or extra effects.",
  "Do not place the mark on low-contrast or busy photography.",
  "Do not rearrange the wordmark letters or replace the typeface.",
];

export const ABOUT_RESOURCE_LINKS = [
  { href: "/contact?topic=partnerships", label: "Contact & partnerships" },
  { href: "/careers", label: "Careers" },
  { href: "/help", label: "Help Center" },
  { href: "/legal", label: "Legal Center" },
];

export const ABOUT_GOVERNANCE_LINKS = [
  { href: "/legal", label: "Legal Center" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/community-guidelines", label: "Community Guidelines" },
  { href: "/legal/copyright-ip", label: "Copyright & IP" },
  { href: "/cookies", label: "Cookie Policy" },
];
