import type { ReactNode } from "react";
import {
  Home,
  Package,
  Plus,
  ShoppingBag,
  Megaphone,
  MessageSquare,
  CreditCard,
  Users,
  RotateCcw,
  ArrowLeft,
  Search,
} from "lucide-react";
import type { EmptyAction, EmptyQuickLink, EmptyVariant } from "./shared";
import {
  CampaignsIllustration,
  EmptyBoxIllustration,
  EmptySearchIllustration,
  MessagesIllustration,
  OfflineIllustration,
  OrdersIllustration,
  ProductsShelfIllustration,
} from "./illustrations";

export type EmptyStatePreset =
  | "products"
  | "orders"
  | "campaigns"
  | "campaigns-admin"
  | "messages"
  | "notifications"
  | "payments"
  | "vendors"
  | "submissions"
  | "feedEmpty"
  | "chatEmpty"
  | "liveEmpty"
  | "libraryEmpty"
  | "search"
  | "generic";

export type PresetContext = {
  /** User typed a search query */
  query?: string;
  /** Filters are active but parent has data */
  filtered?: boolean;
  /** Filter label, e.g. "Pending" */
  filterLabel?: string;
  onReset?: () => void;
};

export type PresetResult = {
  eyebrow?: string;
  title: string;
  description?: string;
  query?: string;
  illustration: ReactNode;
  actions?: EmptyAction[];
};

export function resolveEmptyStatePreset(
  preset: EmptyStatePreset,
  ctx: PresetContext = {},
): PresetResult {
  const { query, filtered, filterLabel, onReset } = ctx;
  const hasQuery = Boolean(query?.trim());
  const isFiltered = filtered || hasQuery || Boolean(filterLabel);

  switch (preset) {
    case "products":
      if (!isFiltered) {
        return {
          eyebrow: "Catalog",
          title: "No products yet",
          description: "List something to sell — physical, digital, or from our product catalog.",
          illustration: <ProductsShelfIllustration />,
          actions: [
            { label: "Add product", href: "/marketplace/new", icon: Plus, variant: "primary" },
          ],
        };
      }
      return {
        eyebrow: "Catalog",
        title: "No matches",
        description: filterLabel
          ? `Nothing in ${filterLabel.toLowerCase()} right now.`
          : "Try a different search or clear your filters.",
        query: query?.trim(),
        illustration: <EmptySearchIllustration />,
        actions: onReset
          ? [{ label: "Clear filters", onClick: onReset, icon: RotateCcw, variant: "ghost" }]
          : undefined,
      };

    case "orders":
      if (!isFiltered) {
        return {
          eyebrow: "Orders",
          title: "No orders yet",
          description: "When someone buys from you, the order lands here for fulfillment.",
          illustration: <OrdersIllustration />,
          actions: [
            { label: "View products", href: "/marketplace", icon: Package, variant: "ghost" },
          ],
        };
      }
      return {
        eyebrow: "Orders",
        title: "No matching orders",
        description: filterLabel
          ? `No ${filterLabel.toLowerCase()} orders in this view.`
          : "Try another status or clear your search.",
        query: query?.trim(),
        illustration: <EmptySearchIllustration />,
        actions: onReset
          ? [{ label: "Clear filters", onClick: onReset, icon: RotateCcw, variant: "ghost" }]
          : undefined,
      };

    case "campaigns-admin":
      if (!isFiltered) {
        return {
          eyebrow: "Campaigns",
          title: "No campaigns yet",
          description: "When vendors publish UGC or clipping campaigns, they will show up here.",
          illustration: <CampaignsIllustration />,
          actions: ADMIN_CAMPAIGN_ACTIONS,
        };
      }
      return {
        eyebrow: "Campaigns",
        title: "No matches",
        description: "Try another status filter or search term.",
        query: query?.trim(),
        illustration: <EmptySearchIllustration />,
        actions: onReset
          ? [{ label: "Reset filters", onClick: onReset, icon: RotateCcw, variant: "ghost" }]
          : undefined,
      };

    case "campaigns":
      if (!isFiltered) {
        return {
          eyebrow: "Campaigns",
          title: "No campaigns yet",
          description: "Launch a UGC or clipping campaign, set a budget, and invite creators.",
          illustration: <CampaignsIllustration />,
          actions: [
            { label: "New campaign", href: "/ugc/campaign-center/campaigns/new", icon: Plus, variant: "primary" },
            { label: "How it works", href: "/ugc", variant: "ghost" },
          ],
        };
      }
      return {
        eyebrow: "Campaigns",
        title: "No matches",
        description: "Try another status or clear your search.",
        query: query?.trim(),
        illustration: <EmptySearchIllustration />,
        actions: onReset
          ? [{ label: "Reset filters", onClick: onReset, icon: RotateCcw, variant: "ghost" }]
          : undefined,
      };

    case "messages":
      return {
        eyebrow: "Inbox",
        title: isFiltered ? "No conversations found" : "Inbox is quiet",
        description: isFiltered
          ? "No threads match your search."
          : "Messages from buyers, creators, and support will show up here.",
        query: query?.trim(),
        illustration: <MessagesIllustration />,
      };

    case "notifications":
      return {
        eyebrow: "Notifications",
        title: "You're all caught up",
        description: "Alerts for orders, payouts, and campaign activity will appear here.",
        illustration: <EmptyBoxIllustration />,
      };

    case "payments":
      return {
        eyebrow: "Payments",
        title: isFiltered ? "No transactions found" : "No payouts yet",
        description: isFiltered
          ? "Adjust your date range or filters."
          : "Withdrawals and payment history will show here once money moves.",
        query: query?.trim(),
        illustration: <OrdersIllustration />,
        actions: [{ label: "Wallet", href: "/wallet", icon: CreditCard, variant: "ghost" }],
      };

    case "vendors":
      return {
        eyebrow: "Vendors",
        title: isFiltered ? "No vendors found" : "No vendors yet",
        description: isFiltered
          ? "Try a different search term."
          : "Seller accounts will appear here once vendors join the platform.",
        query: query?.trim(),
        illustration: <EmptySearchIllustration />,
        actions: [{ label: "Marketplace", href: "/marketplace", icon: Users, variant: "ghost" }],
      };

    case "submissions":
      return {
        eyebrow: "Submissions",
        title: isFiltered ? "No submissions found" : "No submissions yet",
        description: isFiltered
          ? "Try another status filter."
          : "Creator content for your campaigns will show up here for review.",
        query: query?.trim(),
        illustration: <CampaignsIllustration />,
      };

    case "feedEmpty":
      return {
        eyebrow: "Your feed",
        title: "Your feed is ready for you",
        description: "Join communities and follow creators to make this space yours.",
        illustration: <EmptyBoxIllustration />,
        actions: [{ label: "Browse communities", href: "/communities", icon: Users, variant: "primary" }],
      };

    case "chatEmpty":
      return {
        eyebrow: "Chat",
        title: "Start a conversation",
        description: "Meet people in a community or ask for help to get moving.",
        illustration: <MessagesIllustration />,
        actions: [{ label: "Browse communities", href: "/communities", icon: Users, variant: "primary" }],
      };

    case "liveEmpty":
      return {
        eyebrow: "Live",
        title: "No live sessions right now",
        description: "Explore communities to find upcoming sessions and creator events.",
        illustration: <EmptyBoxIllustration />,
        actions: [{ label: "Explore communities", href: "/communities", icon: Users, variant: "primary" }],
      };

    case "libraryEmpty":
      return {
        eyebrow: "Library",
        title: "Your library is waiting",
        description: "Save products, courses, and content you want to return to.",
        illustration: <ProductsShelfIllustration />,
        actions: [{ label: "Browse marketplace", href: "/marketplace/physical", icon: ShoppingBag, variant: "primary" }],
      };

    case "search":
      return {
        eyebrow: "Search",
        title: "Nothing turned up",
        description: "Check the spelling or try a broader term.",
        query: query?.trim(),
        illustration: <EmptySearchIllustration />,
        actions: onReset
          ? [{ label: "Clear search", onClick: onReset, icon: RotateCcw, variant: "ghost" }]
          : undefined,
      };

    case "generic":
    default:
      return {
        title: isFiltered ? "No results" : "Nothing here yet",
        description: isFiltered
          ? "Try changing your filters."
          : "Content will show up once there is something to display.",
        query: query?.trim(),
        illustration: <EmptyBoxIllustration />,
        actions: onReset
          ? [{ label: "Reset", onClick: onReset, icon: RotateCcw, variant: "ghost" }]
          : undefined,
      };
  }
}

export function offlinePagePreset(): PresetResult {
  return {
    eyebrow: "Offline",
    title: "No connection",
    description:
      "Pages you opened recently may still work. Reconnect to sync orders, messages, and campaign updates.",
    illustration: <OfflineIllustration />,
    actions: [
      { label: "Try again", onClick: () => window.location.reload(), icon: RotateCcw, variant: "primary" },
      { label: "Back home", href: "/", icon: Home, variant: "ghost" },
    ],
  };
}

export const NOT_FOUND_QUICK_LINKS: EmptyQuickLink[] = [
  { label: "Browse products", href: "/marketplace", icon: Search },
  { label: "Communities", href: "/communities", icon: Users },
  { label: "Get help", href: "/help", icon: MessageSquare },
];

export const ADMIN_CAMPAIGN_EMPTY_LINKS: EmptyQuickLink[] = [
  { label: "Submissions", href: "/admin/ugc/submissions", icon: Megaphone },
  { label: "Vendors", href: "/admin/vendors", icon: Users },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
];

export const ADMIN_CAMPAIGN_ACTIONS: EmptyAction[] = [
  { label: "Submission queue", href: "/admin/ugc/submissions", variant: "primary" },
];

export const VENDOR_ORDER_ACTIONS: EmptyAction[] = [
  { label: "View products", href: "/marketplace", icon: Package, variant: "ghost" },
];

export const NOT_FOUND_DEFAULT_ACTIONS: EmptyAction[] = [
  { label: "Back home", href: "/", icon: Home, variant: "primary" },
  { label: "Go back", onClick: () => window.history.back(), icon: ArrowLeft, variant: "ghost" },
];
