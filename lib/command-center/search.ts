import { ALL_STATIC_COMMANDS } from "./commands";
import { readCommandRecents, recentToSearchResult } from "./recents";
import { resolvePinnedCommands } from "./pins";
import { CREATOR_OS_SEARCH_PROVIDERS } from "./providers";
import type {
  CommandGroup,
  CommandResult,
  CommandSearchInput,
  CommandSearchOutput,
  CommandSearchProvider,
} from "./types";

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function scoreCommand(command: CommandResult, query: string): number {
  const q = normalize(query);
  if (!q) return command.score ?? 0;
  const title = normalize(command.title);
  const subtitle = normalize(command.subtitle ?? "");
  const keywords = (command.keywords ?? []).map(normalize);
  if (title === q) return 100;
  if (title.startsWith(q)) return 90;
  if (title.includes(q)) return 75;
  if (subtitle.includes(q)) return 60;
  if (keywords.some((k) => k.includes(q) || q.includes(k))) return 55;
  return 0;
}

function filterStatic(query: string, limit: number): CommandResult[] {
  const q = normalize(query);
  if (!q) return [];
  return ALL_STATIC_COMMANDS.map((cmd) => ({
    ...cmd,
    section: "search" as const,
    score: scoreCommand(cmd, q),
  }))
    .filter((cmd) => cmd.score > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}

function groupByKind(items: CommandResult[]): CommandGroup[] {
  const labels: Record<string, string> = {
    command: "Commands",
    page: "Pages",
    product: "Products",
    creator: "Creators",
    community: "Communities",
    course: "Courses",
    "affiliate-campaign": "Affiliate",
    "ugc-campaign": "Campaigns",
    store: "Brands",
    order: "Orders",
    message: "Messages",
    setting: "Settings",
    help: "Help",
    ai: "AI Commands",
    "ai-answer": "AI Answers",
    member: "Creators",
    post: "Recent Files",
    channel: "Spaces",
    event: "Live Sessions",
    knowledge: "Knowledge",
  };

  const map = new Map<string, CommandResult[]>();
  for (const item of items) {
    const key = item.kind;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return [...map.entries()].map(([kind, groupItems]) => ({
    id: kind,
    label: labels[kind] ?? "Results",
    items: groupItems,
  }));
}

function sortByScoreDesc(items: CommandResult[]): CommandResult[] {
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export const localCommandSearchProvider: CommandSearchProvider = {
  id: "local",
  async search(input: CommandSearchInput): Promise<CommandSearchOutput> {
    const limit = input.limit ?? 24;
    const query = input.query.trim();

    if (!query) {
      const pinned = resolvePinnedCommands();
      const recents = readCommandRecents().map(recentToSearchResult);

      const byId = (ids: string[]) =>
        ids
          .map((id) => ALL_STATIC_COMMANDS.find((c) => c.id === id))
          .filter((c): c is (typeof ALL_STATIC_COMMANDS)[number] => Boolean(c))
          .map((c) => ({ ...c, section: "recommended" as const }));

      const work = byId([
        "jump-orders",
        "open-wallet-os",
        "open-messages",
        "open-analytics",
        "nav-communities",
      ]);
      const create = byId([
        "upload-product",
        "create-ugc-campaign",
        "create-community",
        "start-live",
        "create-affiliate-link",
        "create-course",
      ]);
      const createFallback = ALL_STATIC_COMMANDS.filter(
        (c) =>
          c.frequent &&
          /create|go live|upload|import|invite/i.test(`${c.title} ${(c.keywords ?? []).join(" ")}`),
      )
        .slice(0, 6)
        .map((c) => ({ ...c, section: "recommended" as const }));
      const createItems = create.length >= 3 ? create : createFallback;

      const discover = byId([
        "search-marketplace",
        "trending-products",
        "flash-deals",
        "search-communities",
        "open-ai",
      ]);
      const discoverFallback = ALL_STATIC_COMMANDS.filter((c) => c.trending)
        .slice(0, 5)
        .map((c) => ({ ...c, section: "trending" as const }));
      const discoverItems = discover.length >= 2 ? discover : discoverFallback;

      const suggested = [...pinned, ...recents].slice(0, 6);
      const flat = [...suggested, ...work, ...createItems, ...discoverItems].slice(0, limit);
      const groups: CommandGroup[] = [
        { id: "suggested", label: "Recent / Suggested", items: suggested },
        { id: "work", label: "Work", items: work },
        { id: "create", label: "Create", items: createItems },
        { id: "discover", label: "Discover", items: discoverItems },
      ].filter((g) => g.items.length > 0);

      return { groups, flat };
    }

    const staticMatches = filterStatic(query, limit);
    // Single network path via unified discover (+ local action/NL/orders providers).
    // Legacy /api/search/suggestions was a duplicate of the same globalSearch work.
    const providerResults = await Promise.all(
      CREATOR_OS_SEARCH_PROVIDERS.map((p) => p.search(input)),
    );
    const providerFlat = providerResults.flatMap((r) => r.flat);
    const seen = new Set<string>();
    const merged: CommandResult[] = [];

    for (const item of sortByScoreDesc([...staticMatches, ...providerFlat])) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
      if (merged.length >= limit) break;
    }

    return { groups: groupByKind(merged), flat: merged };
  },
};

/** Composite provider — local + creator OS scoped providers. */
export const compositeCommandSearchProvider: CommandSearchProvider = {
  id: "composite",
  async search(input: CommandSearchInput): Promise<CommandSearchOutput> {
    if (!input.query.trim()) {
      const local = await localCommandSearchProvider.search(input);
      const scoped = await communityScopedEmptySafe(input);
      const seen = new Set(local.flat.map((i) => i.id));
      const extra = scoped.flat.filter((i) => !seen.has(i.id));
      const flat = [...local.flat, ...extra].slice(0, input.limit ?? 24);
      const groups = [
        ...local.groups,
        ...scoped.groups.filter((g) => g.items.length > 0),
      ];
      return { groups, flat };
    }
    return localCommandSearchProvider.search(input);
  },
};

async function communityScopedEmptySafe(
  input: CommandSearchInput,
): Promise<CommandSearchOutput> {
  const provider = CREATOR_OS_SEARCH_PROVIDERS.find((p) => p.id === "community-scoped");
  if (!provider) return { groups: [], flat: [] };
  return provider.search(input);
}

export function getCommandSearchProvider(): CommandSearchProvider {
  return compositeCommandSearchProvider;
}
