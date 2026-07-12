import { getStaticCommandById } from "./commands";
import type { PinnedCommand } from "./types";

const PINS_KEY = "jimvio_command_center_pins_v1";

export function readPinnedCommands(): PinnedCommand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is PinnedCommand =>
        typeof p === "object" && p !== null && typeof (p as PinnedCommand).id === "string",
    );
  } catch {
    return [];
  }
}

export function togglePinnedCommand(id: string) {
  if (typeof window === "undefined") return readPinnedCommands();
  const pins = readPinnedCommands();
  const exists = pins.some((p) => p.id === id);
  const next = exists
    ? pins.filter((p) => p.id !== id)
    : [{ id, pinnedAt: Date.now() }, ...pins].slice(0, 8);
  localStorage.setItem(PINS_KEY, JSON.stringify(next));
  return next;
}

export function getDefaultPinnedIds(): string[] {
  return ["open-ai", "search-marketplace", "trending-products"];
}

export function resolvePinnedCommands() {
  const stored = readPinnedCommands();
  const ids =
    stored.length > 0 ? stored.map((p) => p.id) : getDefaultPinnedIds();
  return ids
    .map((id) => getStaticCommandById(id))
    .filter(Boolean)
    .map((cmd) => ({ ...cmd!, section: "pinned" as const }));
}
