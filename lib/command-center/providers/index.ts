/**
 * Pluggable Command Center search providers.
 * Wired to unified /api/discover/search for entity results.
 */

import type {
  CommandResult,
  CommandResultKind,
  CommandSearchInput,
  CommandSearchOutput,
  CommandSearchProvider,
} from "../types";
import { getCommandSearchContext } from "../search-context";
import { nlIntentSearchProvider } from "./nl-intent";
import type { DiscoveryEntityType, DiscoveryHit } from "@/lib/discovery/types";

export { nlIntentSearchProvider };

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

function hitToCommand(hit: DiscoveryHit): CommandResult {
  return {
    id: `discover-${hit.entityType}-${hit.id}`,
    kind: KIND_BY_ENTITY[hit.entityType] ?? "command",
    title: hit.title,
    subtitle: hit.subtitle ?? hit.entityType,
    href: hit.href,
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
                : "search",
    section: "search",
    score: hit.score,
  };
}

async function fetchDiscover(
  query: string,
  types: DiscoveryEntityType[],
  limit = 8
): Promise<CommandResult[]> {
  if (query.trim().length < 2) return [];
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      types: types.join(","),
    });
    const res = await fetch(`/api/discover/search?${params.toString()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: DiscoveryHit[] };
    return (data.items ?? []).map(hitToCommand);
  } catch {
    return [];
  }
}

function entityProvider(
  id: string,
  _kind: CommandResultKind,
  types: DiscoveryEntityType[]
): CommandSearchProvider {
  return {
    id,
    async search(input: CommandSearchInput): Promise<CommandSearchOutput> {
      const items = await fetchDiscover(input.query, types, input.limit ?? 8);
      return {
        groups: items.length ? [{ id, label: id, items }] : [],
        flat: items,
      };
    },
  };
}

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

export const membersSearchProvider = entityProvider("members", "member", ["creator"]);
export const postsSearchProvider = entityProvider("posts", "post", ["post"]);
export const channelsSearchProvider = entityProvider("channels", "channel", ["space"]);
export const eventsSearchProvider = entityProvider("events", "event", ["live"]);
export const knowledgeSearchProvider = entityProvider("knowledge", "knowledge", [
  "course",
  "lesson",
]);
export const messagesSearchProvider = entityProvider("messages", "message", ["message"]);
export const aiAnswersSearchProvider = entityProvider("ai-answers", "ai-answer", [
  "community",
  "course",
  "product",
]);

export const CREATOR_OS_SEARCH_PROVIDERS: CommandSearchProvider[] = [
  nlIntentSearchProvider,
  communityScopedProvider,
  membersSearchProvider,
  postsSearchProvider,
  channelsSearchProvider,
  eventsSearchProvider,
  knowledgeSearchProvider,
  messagesSearchProvider,
  aiAnswersSearchProvider,
];
