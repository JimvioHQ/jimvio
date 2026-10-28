import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Box,
  Camera,
  CloudUpload,
  FileText,
  IdCard,
  Link2,
  Megaphone,
  Package,
  Radio,
  Rocket,
  Search,
  ShoppingBag,
  Store,
  Truck,
  Upload,
  UserPlus,
  Users,
  Video,
} from "lucide-react";

export type OnboardingRoleId =
  | "buyers-sellers"
  | "brands"
  | "affiliates"
  | "dropshippers"
  | "creators"
  | "streamers"
  | "community-owners"
  | "digital-sellers";

export type OnboardingStep = {
  time: string;
  title: string;
  description: string;
  icon: LucideIcon;
  checklist: string;
};

export type WorkflowStep = {
  label: string;
  icon: LucideIcon;
};

export type OnboardingRole = {
  id: OnboardingRoleId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  badge: string;
  headline: string;
  description: string;
  bullets: string[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  steps: OnboardingStep[];
  workflow: WorkflowStep[];
  progressHint: string;
  visual: "marketplace" | "brands" | "affiliates" | "dropship" | "creators" | "live" | "community" | "digital";
};

export const ONBOARDING_ROLES: OnboardingRole[] = [
  {
    id: "buyers-sellers",
    label: "Buyers & Sellers",
    shortLabel: "Buyers & Sellers",
    icon: ShoppingBag,
    badge: "BUYERS & SELLERS",
    headline: "Start buying and selling",
    description:
      "Shop verified products or build your own storefront and start selling to a global audience.",
    bullets: [
      "Physical & digital products",
      "Global marketplace",
      "Open your own store",
      "Secure payments & delivery",
      "Tools to grow your sales",
    ],
    primaryCta: { label: "Start selling", href: "/seller/products" },
    secondaryCta: { label: "Explore Marketplace", href: "/marketplace" },
    steps: [
      {
        time: "0 – 5 min",
        title: "Create your account",
        description: "Sign up with email or Google.",
        icon: UserPlus,
        checklist: "Account ready",
      },
      {
        time: "5 – 10 min",
        title: "Set up your profile",
        description: "Add your name, photo and basic account information.",
        icon: IdCard,
        checklist: "Profile ready",
      },
      {
        time: "10 – 15 min",
        title: "Explore the Marketplace",
        description: "Discover physical, digital and software products.",
        icon: ShoppingBag,
        checklist: "Explore marketplace",
      },
      {
        time: "15 – 22 min",
        title: "Open your store",
        description: "Add products, pricing, inventory and storefront information.",
        icon: Store,
        checklist: "Store ready",
      },
      {
        time: "22 – 30 min",
        title: "Make your first move",
        description: "Buy a product or publish your first listing.",
        icon: Rocket,
        checklist: "First result",
      },
    ],
    workflow: [
      { label: "Discovery", icon: Search },
      { label: "Store", icon: Store },
      { label: "Checkout", icon: ShoppingBag },
      { label: "Delivery", icon: Truck },
      { label: "Growth", icon: BarChart3 },
    ],
    progressHint: "In 30 minutes you'll be ready to buy, sell and grow on Jimvio.",
    visual: "marketplace",
  },
  {
    id: "brands",
    label: "Brands",
    shortLabel: "Brands",
    icon: Megaphone,
    badge: "BRANDS",
    headline: "Launch your first brand campaign",
    description:
      "Connect with creators, run campaigns and grow your brand globally on Jimvio.",
    bullets: [
      "Work with global creators",
      "Run UGC & clipping campaigns",
      "Promote your products worldwide",
      "Track performance and results",
      "Build long-term brand partnerships",
    ],
    primaryCta: { label: "Create a campaign", href: "/ugc/campaign-center/campaigns/new" },
    secondaryCta: { label: "Explore creators", href: "/ugc" },
    steps: [
      {
        time: "0 – 5 min",
        title: "Create your account",
        description: "Sign up with email or Google.",
        icon: UserPlus,
        checklist: "Account ready",
      },
      {
        time: "5 – 10 min",
        title: "Set up your brand",
        description: "Add your brand profile, logo and brand information.",
        icon: IdCard,
        checklist: "Brand profile ready",
      },
      {
        time: "10 – 15 min",
        title: "Create a campaign",
        description: "Define your brief, goals, budget and deliverables.",
        icon: Megaphone,
        checklist: "Campaign created",
      },
      {
        time: "15 – 22 min",
        title: "Find creators",
        description: "Discover creators who match your campaign.",
        icon: Users,
        checklist: "Creators found",
      },
      {
        time: "22 – 30 min",
        title: "Launch & track",
        description: "Review submissions, monitor performance and track results.",
        icon: BarChart3,
        checklist: "Campaign launched",
      },
    ],
    workflow: [
      { label: "Brief", icon: FileText },
      { label: "Creators", icon: Users },
      { label: "Campaign", icon: Megaphone },
      { label: "Content", icon: Camera },
      { label: "Results", icon: BarChart3 },
    ],
    progressHint: "In 30 minutes you'll be ready to launch your first brand campaign on Jimvio.",
    visual: "brands",
  },
  {
    id: "affiliates",
    label: "Affiliates",
    shortLabel: "Affiliates",
    icon: Link2,
    badge: "AFFILIATES",
    headline: "Start earning with affiliate marketing",
    description: "Discover products, share tracked links and earn commissions on Jimvio.",
    bullets: [
      "Promote products from global sellers",
      "Earn real commissions",
      "Tracked links, deep links & QR codes",
      "Detailed analytics and performance",
      "Withdraw your earnings globally",
    ],
    primaryCta: { label: "Start earning", href: "/affiliates" },
    secondaryCta: { label: "Find products", href: "/marketplace" },
    steps: [
      {
        time: "0 – 5 min",
        title: "Create your account",
        description: "Sign up with email or Google.",
        icon: UserPlus,
        checklist: "Account ready",
      },
      {
        time: "5 – 10 min",
        title: "Set up your profile",
        description: "Add your name, photo and basic account information.",
        icon: IdCard,
        checklist: "Profile ready",
      },
      {
        time: "10 – 15 min",
        title: "Find products",
        description: "Browse products with strong commission potential.",
        icon: Search,
        checklist: "Products found",
      },
      {
        time: "15 – 22 min",
        title: "Create your affiliate link",
        description: "Generate tracked links ready to share.",
        icon: Link2,
        checklist: "Affiliate link created",
      },
      {
        time: "22 – 30 min",
        title: "Start promoting",
        description: "Share links and track your first clicks.",
        icon: BarChart3,
        checklist: "Start promoting",
      },
    ],
    workflow: [
      { label: "Products", icon: Package },
      { label: "Links", icon: Link2 },
      { label: "Promote", icon: Megaphone },
      { label: "Analytics", icon: BarChart3 },
      { label: "Payouts", icon: Store },
    ],
    progressHint:
      "In 30 minutes you'll be ready to promote products and earn your first commission on Jimvio.",
    visual: "affiliates",
  },
  {
    id: "dropshippers",
    label: "Dropshippers",
    shortLabel: "Dropshippers",
    icon: Truck,
    badge: "DROPSHIPPERS",
    headline: "Start dropshipping",
    description:
      "Find trending products, connect with global suppliers and sell without holding inventory.",
    bullets: [
      "Access global suppliers",
      "Import products in one click",
      "Automatic order fulfillment",
      "Shipping & tracking where available",
      "Start your own storefront",
      "Scale your business globally",
    ],
    primaryCta: { label: "Start dropshipping", href: "/commerce" },
    secondaryCta: { label: "Browse products", href: "/marketplace" },
    steps: [
      {
        time: "0 – 5 min",
        title: "Create your account",
        description: "Sign up with email or Google.",
        icon: UserPlus,
        checklist: "Account ready",
      },
      {
        time: "5 – 10 min",
        title: "Choose your niche",
        description: "Explore categories and find winning products.",
        icon: Search,
        checklist: "Niche selected",
      },
      {
        time: "10 – 15 min",
        title: "Find products",
        description: "Browse products from global suppliers.",
        icon: Box,
        checklist: "Products found",
      },
      {
        time: "15 – 22 min",
        title: "Import & prepare",
        description: "Import products, review pricing, media, variants and details.",
        icon: CloudUpload,
        checklist: "Products imported",
      },
      {
        time: "22 – 30 min",
        title: "Start selling",
        description: "Publish products to your storefront and prepare for orders.",
        icon: Store,
        checklist: "Store ready",
      },
    ],
    workflow: [
      { label: "Sourcing", icon: Search },
      { label: "Import", icon: CloudUpload },
      { label: "Storefront", icon: Store },
      { label: "Fulfillment", icon: Truck },
      { label: "Tracking", icon: BarChart3 },
    ],
    progressHint:
      "In 30 minutes you'll be ready to launch your first dropshipping store on Jimvio.",
    visual: "dropship",
  },
  {
    id: "creators",
    label: "Creators",
    shortLabel: "Creators",
    icon: Camera,
    badge: "CREATORS",
    headline: "Turn your content into income",
    description:
      "Create content, join campaigns and build multiple income streams on Jimvio.",
    bullets: [
      "Join brand campaigns",
      "Create UGC & clipping content",
      "Monetize your audience",
      "Track performance and earnings",
      "Build your personal brand globally",
    ],
    primaryCta: { label: "Find campaigns", href: "/ugc" },
    secondaryCta: { label: "Create content", href: "/create/post" },
    steps: [
      {
        time: "0 – 5 min",
        title: "Create your account",
        description: "Sign up with email or Google.",
        icon: UserPlus,
        checklist: "Account ready",
      },
      {
        time: "5 – 10 min",
        title: "Build your creator profile",
        description: "Add photo, bio and creator details.",
        icon: IdCard,
        checklist: "Profile ready",
      },
      {
        time: "10 – 15 min",
        title: "Discover opportunities",
        description: "Browse campaigns that match your style.",
        icon: Search,
        checklist: "Opportunities found",
      },
      {
        time: "15 – 22 min",
        title: "Create & publish",
        description: "Submit UGC, clips or posts for a campaign.",
        icon: Video,
        checklist: "Content published",
      },
      {
        time: "22 – 30 min",
        title: "Track your earnings",
        description: "Monitor performance and payouts.",
        icon: BarChart3,
        checklist: "Earnings tracked",
      },
    ],
    workflow: [
      { label: "Campaigns", icon: Megaphone },
      { label: "UGC", icon: Camera },
      { label: "Content", icon: FileText },
      { label: "Analytics", icon: BarChart3 },
      { label: "Payouts", icon: Store },
    ],
    progressHint:
      "In 30 minutes you'll be ready to create content, join campaigns and start earning on Jimvio.",
    visual: "creators",
  },
  {
    id: "streamers",
    label: "Streamers",
    shortLabel: "Streamers",
    icon: Radio,
    badge: "STREAMERS",
    headline: "Go live on Jimvio",
    description: "Build your audience through live sessions, communities and live commerce.",
    bullets: [
      "Go live in seconds",
      "Engage with your audience",
      "Screen sharing and co-hosting",
      "Earn through live commerce",
      "Build your community",
      "Grow your global presence",
    ],
    primaryCta: { label: "Go Live", href: "/communities/live" },
    secondaryCta: { label: "Create a community", href: "/communities/create" },
    steps: [
      {
        time: "0 – 5 min",
        title: "Create your account",
        description: "Sign up with email or Google.",
        icon: UserPlus,
        checklist: "Account ready",
      },
      {
        time: "5 – 10 min",
        title: "Set up your profile",
        description: "Add photo, bio, and streaming info.",
        icon: IdCard,
        checklist: "Profile ready",
      },
      {
        time: "10 – 15 min",
        title: "Create or join a community",
        description: "Join existing or create your own.",
        icon: Users,
        checklist: "Community ready",
      },
      {
        time: "15 – 22 min",
        title: "Prepare your live session",
        description: "Set title, audience, and commerce options.",
        icon: Video,
        checklist: "Stream ready",
      },
      {
        time: "22 – 30 min",
        title: "Go live",
        description: "Start streaming and begin engaging.",
        icon: Radio,
        checklist: "Live session started",
      },
    ],
    workflow: [
      { label: "Go Live", icon: Radio },
      { label: "Chat", icon: Users },
      { label: "Share", icon: Video },
      { label: "Commerce", icon: ShoppingBag },
      { label: "Community", icon: Users },
    ],
    progressHint:
      "In 30 minutes you'll be ready to engage your audience and build your live presence on Jimvio.",
    visual: "live",
  },
  {
    id: "community-owners",
    label: "Community Owners",
    shortLabel: "Community Owners",
    icon: Users,
    badge: "COMMUNITY OWNERS",
    headline: "Build your community",
    description:
      "Create a space where people can connect, learn, share and grow together on Jimvio.",
    bullets: [
      "Create public or private communities",
      "Host live rooms and events",
      "Share courses, content and resources",
      "Monetize with paid memberships",
      "Grow your global community",
      "Moderate and manage with ease",
    ],
    primaryCta: { label: "Create community", href: "/communities/create" },
    secondaryCta: { label: "Explore communities", href: "/communities" },
    steps: [
      {
        time: "0 – 5 min",
        title: "Create your account",
        description: "Sign up with email or Google.",
        icon: UserPlus,
        checklist: "Account ready",
      },
      {
        time: "5 – 10 min",
        title: "Create your community",
        description: "Set your community name, niche and basic information.",
        icon: Users,
        checklist: "Community created",
      },
      {
        time: "10 – 15 min",
        title: "Set up your spaces",
        description: "Configure public/private areas, rules and community structure.",
        icon: Store,
        checklist: "Spaces configured",
      },
      {
        time: "15 – 22 min",
        title: "Add your experience",
        description: "Create events, live sessions, courses or discussions.",
        icon: Video,
        checklist: "Content and events added",
      },
      {
        time: "22 – 30 min",
        title: "Invite your first members",
        description: "Share your community and start building your audience.",
        icon: Rocket,
        checklist: "First members invited",
      },
    ],
    workflow: [
      { label: "Create", icon: Users },
      { label: "Spaces", icon: Store },
      { label: "Content", icon: FileText },
      { label: "Go Live", icon: Radio },
      { label: "Invite", icon: Rocket },
    ],
    progressHint:
      "In 30 minutes you'll be ready to launch your community and invite your first members on Jimvio.",
    visual: "community",
  },
  {
    id: "digital-sellers",
    label: "Digital Sellers",
    shortLabel: "Digital Sellers",
    icon: FileText,
    badge: "DIGITAL SELLERS",
    headline: "Sell digital products",
    description:
      "Turn your knowledge, skills, and digital assets into products people can buy on Jimvio.",
    bullets: [
      "Sell courses, e-books, software and more",
      "Easy product creation and delivery",
      "Secure digital checkout",
      "Track sales, analytics and earnings",
      "Reach buyers worldwide",
    ],
    primaryCta: { label: "Start selling", href: "/marketplace/digital" },
    secondaryCta: { label: "Create product", href: "/seller/products" },
    steps: [
      {
        time: "0 – 5 min",
        title: "Create your account",
        description: "Sign up with email or Google.",
        icon: UserPlus,
        checklist: "Account ready",
      },
      {
        time: "5 – 10 min",
        title: "Set up your seller profile",
        description: "Add store details and seller information.",
        icon: IdCard,
        checklist: "Profile ready",
      },
      {
        time: "10 – 15 min",
        title: "Create your digital product",
        description: "Upload your course, e-book or digital asset.",
        icon: FileText,
        checklist: "Product created",
      },
      {
        time: "15 – 22 min",
        title: "Configure pricing & delivery",
        description: "Set price, access rules and delivery method.",
        icon: Package,
        checklist: "Pricing & delivery set",
      },
      {
        time: "22 – 30 min",
        title: "Publish & start selling",
        description: "Make your product live and share it.",
        icon: Upload,
        checklist: "Product live",
      },
    ],
    workflow: [
      { label: "Create", icon: FileText },
      { label: "Pricing", icon: Package },
      { label: "Delivery", icon: CloudUpload },
      { label: "Publish", icon: Upload },
      { label: "Sales", icon: BarChart3 },
    ],
    progressHint:
      "In 30 minutes you'll be ready to publish your first digital product and start earning on Jimvio.",
    visual: "digital",
  },
];

export function getOnboardingRole(id: OnboardingRoleId): OnboardingRole {
  return ONBOARDING_ROLES.find((r) => r.id === id) ?? ONBOARDING_ROLES[0];
}
