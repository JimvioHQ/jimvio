/**
 * Pluggable Command Center search providers.
 * Stubs prepare architecture for members/posts/channels/events/knowledge/AI
 * until remote backends are connected.
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

export { nlIntentSearchProvider };

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function matches(query: string, ...parts: Array<string | undefined>) {
  const q = normalize(query);
  if (!q) return false;
  return parts.some((p) => p && normalize(p).includes(q));
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
      ? catalog.filter((c) =>
          matches(q, c.title, c.subtitle, ...(c.keywords ?? []))
        )
      : catalog.slice(0, 6);

    return {
      groups: items.length
        ? [{ id: "community", label: "This community", items }]
        : [],
      flat: items,
    };
  },
};

/**
 * Stub providers — return empty until backends are wired.
 * Kept registered so kinds/filters are ready without API changes.
 */
function stubProvider(
  id: string,
  _kind: CommandResultKind
): CommandSearchProvider {
  return {
    id,
    async search(): Promise<CommandSearchOutput> {
      return { groups: [], flat: [] };
    },
  };
}

export const membersSearchProvider = stubProvider("members", "member");
export const postsSearchProvider = stubProvider("posts", "post");
export const channelsSearchProvider = stubProvider("channels", "channel");
export const eventsSearchProvider = stubProvider("events", "event");
export const knowledgeSearchProvider = stubProvider("knowledge", "knowledge");
export const messagesSearchProvider = stubProvider("messages", "message");
export const aiAnswersSearchProvider = stubProvider("ai-answers", "ai-answer");

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
