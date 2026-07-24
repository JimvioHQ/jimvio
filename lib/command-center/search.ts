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
    "affiliate-campaign": "Affiliate Campaigns",
    "ugc-campaign": "UGC Campaigns",
    store: "Stores",
    order: "Orders",
    message: "Messages",
    setting: "Settings",
    help: "Help",
    ai: "AI",
    "ai-answer": "AI Answers",
    member: "Members",
    post: "Posts",
    channel: "Channels",
    event: "Events",
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

/** Maps existing suggestion API payloads — read-only, no API changes. */
function mapSuggestionProducts(products: Array<{ id: string; name: string; slug: string }>) {
  return products.map<CommandResult>((p) => ({
    id: `product-${p.id}`,
    kind: "product",
    title: p.name,
    subtitle: "Marketplace product",
    href: `/marketplace/${p.slug}`,
    icon: "package",
    section: "search",
  }));
}

function mapSuggestionVendors(
  vendors: Array<{ id: string; business_name: string; business_slug: string }>,
) {
  return vendors.map<CommandResult>((v) => ({
    id: `store-${v.id}`,
    kind: "store",
    title: v.business_name,
    subtitle: "Vendor store",
    href: `/vendors/${v.business_slug}`,
    icon: "store",
    section: "search",
  }));
}

async function fetchLegacySuggestions(query: string): Promise<CommandResult[]> {
  if (query.trim().length < 2) return [];
  try {
    const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      products?: Array<{ id: string; name: string; slug: string }>;
      vendors?: Array<{ id: string; business_name: string; business_slug: string }>;
    };
    return [
      ...mapSuggestionProducts(data.products ?? []),
      ...mapSuggestionVendors(data.vendors ?? []),
    ];
  } catch {
    return [];
  }
}

export const localCommandSearchProvider: CommandSearchProvider = {
  id: "local",
  async search(input: CommandSearchInput): Promise<CommandSearchOutput> {
    const limit = input.limit ?? 24;
    const query = input.query.trim();

    if (!query) {
      const pinned = resolvePinnedCommands();
      const recents = readCommandRecents().map(recentToSearchResult);
      const trending = ALL_STATIC_COMMANDS.filter((c) => c.trending).map((c) => ({
        ...c,
        section: "trending" as const,
      }));
      const frequent = ALL_STATIC_COMMANDS.filter((c) => c.frequent).map((c) => ({
        ...c,
        section: "frequent" as const,
      }));
      const recommended = ALL_STATIC_COMMANDS.slice(0, 6).map((c) => ({
        ...c,
        section: "recommended" as const,
      }));

      const flat = [...pinned, ...recents, ...trending, ...frequent, ...recommended].slice(
        0,
        limit,
      );
      const groups: CommandGroup[] = [
        { id: "pinned", label: "Pinned", items: pinned },
        { id: "recent", label: "Recent", items: recents },
        { id: "trending", label: "Trending actions", items: trending },
        { id: "frequent", label: "Frequently used", items: frequent },
        { id: "recommended", label: "Recommended", items: recommended },
      ].filter((g) => g.items.length > 0);

      return { groups, flat };
    }

    const staticMatches = filterStatic(query, limit);
    const remote = await fetchLegacySuggestions(query);
    const providerResults = await Promise.all(
      CREATOR_OS_SEARCH_PROVIDERS.map((p) => p.search(input))
    );
    const providerFlat = providerResults.flatMap((r) => r.flat);
    const seen = new Set<string>();
    const flat: CommandResult[] = [];

    for (const item of [...staticMatches, ...providerFlat, ...remote]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      flat.push(item);
      if (flat.length >= limit) break;
    }

    return { groups: groupByKind(flat), flat };
  },
};

/** Composite provider — local + creator OS stubs/scoped providers. */
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
  input: CommandSearchInput
): Promise<CommandSearchOutput> {
  const provider = CREATOR_OS_SEARCH_PROVIDERS.find(
    (p) => p.id === "community-scoped"
  );
  if (!provider) return { groups: [], flat: [] };
  return provider.search(input);
}

export function getCommandSearchProvider(): CommandSearchProvider {
  return compositeCommandSearchProvider;
}
