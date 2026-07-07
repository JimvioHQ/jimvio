import type { CommandCenterQuickAction, CommandCenterAIPrompt } from "./types";

export const CREATOR_COMMAND_ACTIONS: CommandCenterQuickAction[] = [
  {
    id: "sell-product",
    label: "Sell Product",
    description: "List a new offer",
    href: "/dashboard/products/new",
    icon: "store",
    accent: "#fd5000",
  },
  {
    id: "upload-product",
    label: "Upload Product",
    description: "Add to your catalog",
    href: "/dashboard/products/new",
    icon: "upload",
    accent: "#2563eb",
  },
  {
    id: "create-community",
    label: "Create Community",
    description: "Launch a creator hub",
    href: "/dashboard/communities",
    icon: "users",
    accent: "#16a34a",
  },
  {
    id: "create-course",
    label: "Create Course",
    description: "Publish a digital course",
    href: "/dashboard/products/new",
    icon: "graduation",
    accent: "#7c3aed",
  },
  {
    id: "go-live",
    label: "Go Live",
    description: "Open video studio",
    href: "/dashboard/influencer/videos",
    icon: "video",
    accent: "#dc2626",
  },
  {
    id: "create-campaign",
    label: "Create Campaign",
    description: "UGC or affiliate push",
    href: "/dashboard/vendor/campaigns/new",
    icon: "megaphone",
    accent: "#ea580c",
  },
  {
    id: "withdraw",
    label: "Withdraw Earnings",
    description: "Move funds to wallet",
    href: "/dashboard/withdrawals",
    icon: "wallet",
    accent: "#0891b2",
  },
  {
    id: "invite",
    label: "Invite Members",
    description: "Grow your audience",
    href: "/dashboard/requests",
    icon: "user-plus",
    accent: "#4f46e5",
  },
  {
    id: "analytics",
    label: "View Analytics",
    description: "Deep performance view",
    href: "/dashboard/analytics",
    icon: "chart",
    accent: "#0d9488",
  },
  {
    id: "open-ai",
    label: "Open Jimvio AI",
    description: "Creator copilot workspace",
    actionId: "open-ai",
    icon: "sparkles",
    accent: "#fd5000",
  },
];

export const CREATOR_COMMAND_AI_PROMPTS: CommandCenterAIPrompt[] = [
  {
    id: "generate-product",
    label: "Generate Product",
    prompt: "Help me generate a high-converting product idea for my Jimvio store.",
    icon: "package",
  },
  {
    id: "write-description",
    label: "Write Description",
    prompt: "Write a premium product description for my latest listing.",
    icon: "pen",
  },
  {
    id: "improve-seo",
    label: "Improve SEO",
    prompt: "Improve SEO for my Jimvio product listings and creator profile.",
    icon: "search",
  },
  {
    id: "recommend-products",
    label: "Recommend Products",
    prompt: "Recommend products I should promote as a creator this week.",
    icon: "sparkles",
  },
  {
    id: "find-trends",
    label: "Find Trends",
    prompt: "What creator commerce trends should I capitalize on right now?",
    icon: "flame",
  },
  {
    id: "optimize-pricing",
    label: "Optimize Pricing",
    prompt: "Suggest pricing optimizations for my products and communities.",
    icon: "percent",
  },
  {
    id: "answer-customer",
    label: "Answer Customer",
    prompt: "Draft a helpful reply to a customer question about my product.",
    icon: "message",
  },
  {
    id: "summarize-analytics",
    label: "Summarize Analytics",
    prompt: "Summarize my creator analytics and what I should do next.",
    icon: "chart",
  },
];

export const DEFAULT_CALENDAR_EVENTS = [
  {
    id: "cal-1",
    title: "UGC campaign review",
    date: new Date(Date.now() + 86400000 * 2).toISOString(),
    kind: "campaign" as const,
    href: "/dashboard/campaigns",
  },
  {
    id: "cal-2",
    title: "Community live session",
    date: new Date(Date.now() + 86400000 * 4).toISOString(),
    kind: "live" as const,
    href: "/dashboard/influencer/videos",
  },
  {
    id: "cal-3",
    title: "Course module release",
    date: new Date(Date.now() + 86400000 * 7).toISOString(),
    kind: "course" as const,
    href: "/dashboard/products",
  },
];
