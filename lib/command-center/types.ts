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
  | "command"
  | "page";

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
};
