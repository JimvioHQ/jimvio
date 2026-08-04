/**
 * Jimvio OS Workspace Memory — additive, client-only localStorage layer.
 * Tracks lightweight cross-session context (favorite workspace, last pages,
 * recent command-driven actions, and favorited entities) purely for UI
 * personalization. No API calls, no schema, no business logic.
 */

import type { OsWorkspaceMode } from "./types";

const MEMORY_STORAGE_KEY = "jimvio-os-memory-v1";
const MAX_LAST_PAGES = 12;
const MAX_RECENT_ACTIONS = 20;

export type OsMemoryEntity = {
  id: string;
  label: string;
  href: string;
};

export type OsMemoryLastPage = {
  href: string;
  label: string;
  at: number;
};

export type OsMemoryRecentAction = {
  id: string;
  label: string;
  href?: string;
  at: number;
};

export type OsWorkspaceMemory = {
  favoriteWorkspace?: OsWorkspaceMode;
  lastPages: OsMemoryLastPage[];
  recentActions: OsMemoryRecentAction[];
  favoriteCreators: OsMemoryEntity[];
  favoriteSuppliers: OsMemoryEntity[];
  favoriteCommunities: OsMemoryEntity[];
  favoriteCampaigns: OsMemoryEntity[];
};

export type OsFavoriteEntityKind = "creators" | "suppliers" | "communities" | "campaigns";

const FAVORITE_FIELD_BY_KIND: Record<OsFavoriteEntityKind, keyof OsWorkspaceMemory> = {
  creators: "favoriteCreators",
  suppliers: "favoriteSuppliers",
  communities: "favoriteCommunities",
  campaigns: "favoriteCampaigns",
};

function emptyMemory(): OsWorkspaceMemory {
  return {
    favoriteWorkspace: undefined,
    lastPages: [],
    recentActions: [],
    favoriteCreators: [],
    favoriteSuppliers: [],
    favoriteCommunities: [],
    favoriteCampaigns: [],
  };
}

function isEntityArray(value: unknown): value is OsMemoryEntity[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        v &&
        typeof v === "object" &&
        typeof (v as OsMemoryEntity).id === "string" &&
        typeof (v as OsMemoryEntity).label === "string" &&
        typeof (v as OsMemoryEntity).href === "string",
    )
  );
}

/** Safe JSON parse + shape guard — never throws, always returns a well-formed memory object. */
export function loadMemory(): OsWorkspaceMemory {
  if (typeof window === "undefined") return emptyMemory();
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return emptyMemory();
    const parsed = JSON.parse(raw) as Partial<OsWorkspaceMemory> | null;
    if (!parsed || typeof parsed !== "object") return emptyMemory();

    return {
      favoriteWorkspace:
        typeof parsed.favoriteWorkspace === "string"
          ? (parsed.favoriteWorkspace as OsWorkspaceMode)
          : undefined,
      lastPages: Array.isArray(parsed.lastPages) ? parsed.lastPages : [],
      recentActions: Array.isArray(parsed.recentActions) ? parsed.recentActions : [],
      favoriteCreators: isEntityArray(parsed.favoriteCreators) ? parsed.favoriteCreators : [],
      favoriteSuppliers: isEntityArray(parsed.favoriteSuppliers) ? parsed.favoriteSuppliers : [],
      favoriteCommunities: isEntityArray(parsed.favoriteCommunities)
        ? parsed.favoriteCommunities
        : [],
      favoriteCampaigns: isEntityArray(parsed.favoriteCampaigns) ? parsed.favoriteCampaigns : [],
    };
  } catch {
    return emptyMemory();
  }
}

export function saveMemory(memory: OsWorkspaceMemory) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* silent */
  }
}

export function pushLastPage(page: { href: string; label: string }) {
  if (typeof window === "undefined") return;
  const memory = loadMemory();
  const filtered = memory.lastPages.filter((p) => p.href !== page.href);
  const lastPages = [{ href: page.href, label: page.label, at: Date.now() }, ...filtered].slice(
    0,
    MAX_LAST_PAGES,
  );
  saveMemory({ ...memory, lastPages });
}

export function pushRecentAction(action: { id: string; label: string; href?: string }) {
  if (typeof window === "undefined") return;
  const memory = loadMemory();
  const filtered = memory.recentActions.filter((a) => a.id !== action.id);
  const recentActions = [
    { id: action.id, label: action.label, href: action.href, at: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_ACTIONS);
  saveMemory({ ...memory, recentActions });
}

/** Toggles an entity in/out of its favorites list. Returns the updated list. */
export function toggleFavoriteEntity(
  kind: OsFavoriteEntityKind,
  entity: OsMemoryEntity,
): OsMemoryEntity[] {
  if (typeof window === "undefined") return [];
  const memory = loadMemory();
  const field = FAVORITE_FIELD_BY_KIND[kind];
  const current = memory[field] as OsMemoryEntity[];
  const exists = current.some((e) => e.id === entity.id);
  const next = exists ? current.filter((e) => e.id !== entity.id) : [entity, ...current];
  saveMemory({ ...memory, [field]: next });
  return next;
}

export function setFavoriteWorkspace(mode: OsWorkspaceMode) {
  if (typeof window === "undefined") return;
  const memory = loadMemory();
  saveMemory({ ...memory, favoriteWorkspace: mode });
}

export function getMemorySnapshot(): OsWorkspaceMemory {
  return loadMemory();
}

export { MEMORY_STORAGE_KEY as OS_MEMORY_STORAGE_KEY };
