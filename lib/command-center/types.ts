export type CommandResultKind =
  | "product"
  | "creator"
  | "community"
  | "course"
  | "affiliate-campaign"
  | "ugc-campaign"
  | "store"
  | "order"
  | "message"
  | "setting"
  | "help"
  | "ai"
  | "ai-answer"
  | "command"
  | "page"
  | "member"
  | "post"
  | "channel"
  | "event"
  | "knowledge";

export type CommandSection =
  | "pinned"
  | "trending"
  | "frequent"
  | "recommended"
  | "recent"
  | "search";

export type CommandResult = {
  id: string;
  kind: CommandResultKind;
  title: string;
  subtitle?: string;
  href?: string;
  keywords?: string[];
  icon?: string;
  image?: string | null;
  badge?: string;
  meta?: Record<string, string>;
  section?: CommandSection;
  score?: number;
  /** Runtime action — navigation commands use href instead. */
  actionId?: string;
};

export type CommandGroup = {
  id: string;
  label: string;
  items: CommandResult[];
};

export type CommandSearchInput = {
  query: string;
  limit?: number;
  /** Optional abort signal — cancels in-flight network requests on new keystrokes. */
  signal?: AbortSignal;
};

export type CommandSearchOutput = {
  groups: CommandGroup[];
  flat: CommandResult[];
};

/** Pluggable search — swap for AI / global search services later. */
export interface CommandSearchProvider {
  readonly id: string;
  search(input: CommandSearchInput): Promise<CommandSearchOutput>;
}

export type RecentItem = {
  id: string;
  kind: CommandResultKind;
  title: string;
  subtitle?: string;
  href?: string;
  visitedAt: number;
};

export type PinnedCommand = {
  id: string;
  pinnedAt: number;
  /** Snapshot of the pinned result, used when it isn't a known static command. */
  kind?: CommandResultKind;
  title?: string;
  subtitle?: string;
  href?: string;
  icon?: string;
  actionId?: string;
};
