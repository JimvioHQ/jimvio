/**
 * Pluggable Command Center search providers.
 * Wired to unified /api/discover/search for entity results.
 */

import type {
  CommandGroup,
  CommandResult,
  CommandResultKind,
  CommandSearchInput,
  CommandSearchOutput,
  CommandSearchProvider,
} from "../types";
import { getCommandSearchContext } from "../search-context";
import { nlIntentSearchProvider } from "./nl-intent";
import { resolveActionEngine } from "../action-engine";
import { ordersSearchProvider } from "./orders";
import type { DiscoveryEntityType, DiscoveryHit } from "@/lib/discovery/types";

export { nlIntentSearchProvider };
export { ordersSearchProvider };

/** Highest-priority provider — resolves action phrases (create campaign, withdraw, go live…) into direct results. */
export const actionEngineProvider: CommandSearchProvider = {
  id: "action-engine",
  async search(input: CommandSearchInput): Promise<CommandSearchOutput> {
    const query = input.query.trim();
    if (query.length < 2) return { groups: [], flat: [] };
    const items = resolveActionEngine(query, input.limit ?? 6);
    return {
      groups: items.length ? [{ id: "actions", label: "Actions", items }] : [],
      flat: items,
    };
  },
};

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function matches(query: string, ...parts: Array<string | undefined>) {
  const q = normalize(query);
  if (!q) return false;
  return parts.some((p) => p && normalize(p).includes(q));
}

const KIND_BY_ENTITY: Partial<Record<DiscoveryEntityType, CommandResultKind>> = {
  product: "product",
  digital: "product",
  creator: "creator",
  community: "community",
  course: "course",
  campaign: "affiliate-campaign",
  space: "channel",
  post: "post",
  message: "message",
  live: "event",
  lesson: "course",
};

const GROUP_LABEL_BY_KIND: Partial<Record<CommandResultKind, string>> = {
  product: "Products",
  creator: "Creators",
  community: "Communities",
  course: "Courses",
  "affiliate-campaign": "Campaigns",
  channel: "Spaces",
  post: "Posts",
  message: "Messages",
  event: "Live",
};

/** Every entity type the unified provider fans out to in a single request. */
const UNIFIED_DISCOVER_TYPES: DiscoveryEntityType[] = [
  "product",
  "digital",
  "creator",
  "community",
  "course",
  "campaign",
  "space",
  "post",
  "message",
  "live",
  "lesson",
];

function hitToCommand(hit: DiscoveryHit): CommandResult {
  const price =
    typeof hit.meta?.price === "number"
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: typeof hit.meta.currency === "string" ? hit.meta.currency : "USD",
          maximumFractionDigits: 2,
        }).format(hit.meta.price)
      : null;
  const subtitleParts = [hit.subtitle ?? hit.entityType, price].filter(Boolean);

  return {
    id: `discover-${hit.entityType}-${hit.id}`,
    kind: KIND_BY_ENTITY[hit.entityType] ?? "command",
    title: hit.title,
    subtitle: subtitleParts.join(" · "),
    href: hit.href,
    image: hit.imageUrl ?? null,
    icon:
      hit.entityType === "community"
        ? "users"
        : hit.entityType === "product" || hit.entityType === "digital"
          ? "package"
          : hit.entityType === "course" || hit.entityType === "lesson"
            ? "graduation"
            : hit.entityType === "live"
              ? "radio"
              : hit.entityType === "message"
                ? "message"
                : hit.entityType === "campaign"
                  ? "megaphone"
                  : hit.entityType === "creator"
                    ? "users"
                    : "search",
    section: "search",
    score: hit.score,
    badge:
      hit.entityType === "campaign" && hit.meta?.kind === "ugc"
        ? "UGC"
        : hit.entityType === "campaign"
          ? "Affiliate"
          : undefined,
  };
}

/** Read-only fetch against the existing unified discover endpoint — no API changes. */
export async function fetchDiscover(
  query: string,
  types: DiscoveryEntityType[],
  limit = 8,
  signal?: AbortSignal,
): Promise<CommandResult[]> {
  if (query.trim().length < 2) return [];
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      types: types.join(","),
    });
    const res = await fetch(`/api/discover/search?${params.toString()}`, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: DiscoveryHit[] };
    return (data.items ?? []).map(hitToCommand);
  } catch {
    return [];
  }
}

/**
 * Coalesced entity provider — fetches every entity type in ONE
 * /api/discover/search call, then splits the flat hit list into
 * labeled groups (Products, Communities, Creators, ...).
 */
export const unifiedDiscoverProvider: CommandSearchProvider = {
  id: "unified-discover",
  async search(input: CommandSearchInput): Promise<CommandSearchOutput> {
    const items = await fetchDiscover(
      input.query,
      UNIFIED_DISCOVER_TYPES,
      input.limit ?? 24,
      input.signal,
    );
    if (!items.length) return { groups: [], flat: items };

    const map = new Map<string, CommandResult[]>();
    for (const item of items) {
      const list = map.get(item.kind) ?? [];
      list.push(item);
      map.set(item.kind, list);
    }

    const groups: CommandGroup[] = [...map.entries()].map(([kind, groupItems]) => ({
      id: `discover-${kind}`,
      label: GROUP_LABEL_BY_KIND[kind as CommandResultKind] ?? "Results",
      items: groupItems,
    }));

    return { groups, flat: items };
  },
};

/** Community-scoped creator actions when overview context is set. */
export const communityScopedProvider: CommandSearchProvider = {
  id: "community-scoped",
  async search(input: CommandSearchInput): Promise<CommandSearchOutput> {
    const ctx = getCommandSearchContext();
    const base = ctx.base;
    if (!base) return { groups: [], flat: [] };

    const catalog: CommandResult[] = [
      {
        id: "cc-members",
        kind: "member",
        title: "Members",
        subtitle: "Browse and message community members",
        href: `${base}/members`,
        keywords: ["members", "people", "roster"],
        icon: "users",
      },
      {
        id: "cc-feed",
        kind: "post",
        title: "Community feed",
        subtitle: "Posts and discussions",
        href: `${base}/feed`,
        keywords: ["posts", "feed", "discussions"],
        icon: "message",
      },
      {
        id: "cc-channels",
        kind: "channel",
        title: "Spaces",
        subtitle: "Open community Spaces",
        href: `${base}?section=spaces`,
        keywords: ["spaces", "rooms", "collaboration"],
        icon: "layers",
      },
      {
        id: "cc-events",
        kind: "event",
        title: "Events",
        subtitle: "Upcoming community events",
        href: `${base}/events`,
        keywords: ["events", "calendar", "schedule"],
        icon: "calendar",
      },
      {
        id: "cc-courses",
        kind: "course",
        title: "Courses",
        subtitle: "Learning catalog",
        href: `${base}/courses`,
        keywords: ["courses", "learn", "lessons"],
        icon: "graduation",
      },
      {
        id: "cc-shop",
        kind: "product",
        title: "Community shop",
        subtitle: "Products and offers",
        href: `${base}/shop`,
        keywords: ["products", "shop", "store"],
        icon: "package",
      },
      {
        id: "cc-live",
        kind: "command",
        title: "Start live",
        subtitle: "Go live with your community",
        href: `${base}/live`,
        keywords: ["live", "stream", "broadcast"],
        icon: "radio",
      },
      {
        id: "cc-knowledge",
        kind: "knowledge",
        title: "Knowledge",
        subtitle: "Guides, FAQs, and resources",
        href: `${base}?section=spaces`,
        keywords: ["knowledge", "wiki", "faq", "guides"],
        icon: "book",
      },
      {
        id: "cc-messages",
        kind: "message",
        title: "Messages",
        subtitle: "Open conversations",
        href: "/dashboard/messages",
        keywords: ["messages", "dm", "inbox"],
        icon: "message",
      },
      {
        id: "cc-ai-answer",
        kind: "ai-answer",
        title: "Ask Jimvio AI",
        subtitle: "AI answers for this community",
        actionId: "open-ai",
        keywords: ["ai", "answer", "ask", "copilot"],
        icon: "sparkles",
      },
    ];

    const q = input.query.trim();
    const items = q
      ? catalog.filter((c) => matches(q, c.title, c.subtitle, ...(c.keywords ?? [])))
      : catalog.slice(0, 6);

    return {
      groups: items.length ? [{ id: "community", label: "This community", items }] : [],
      flat: items,
    };
  },
};

/**
 * Legacy per-entity providers — superseded by `unifiedDiscoverProvider`,
 * which fetches every type in a single request. Kept as no-op aliases so
 * any external references stay backward compatible.
 */
function deprecatedNoopProvider(id: string): CommandSearchProvider {
  return {
    id,
    async search(): Promise<CommandSearchOutput> {
      return { groups: [], flat: [] };
    },
  };
}

export const membersSearchProvider = deprecatedNoopProvider("members");
export const postsSearchProvider = deprecatedNoopProvider("posts");
export const channelsSearchProvider = deprecatedNoopProvider("channels");
export const eventsSearchProvider = deprecatedNoopProvider("events");
export const knowledgeSearchProvider = deprecatedNoopProvider("knowledge");
export const messagesSearchProvider = deprecatedNoopProvider("messages");
export const aiAnswersSearchProvider = deprecatedNoopProvider("ai-answers");

export const CREATOR_OS_SEARCH_PROVIDERS: CommandSearchProvider[] = [
  actionEngineProvider,
  nlIntentSearchProvider,
  communityScopedProvider,
  ordersSearchProvider,
  unifiedDiscoverProvider,
];
