import { getStaticCommandById } from "./commands";
import type { CommandResult, PinnedCommand } from "./types";

const PINS_KEY = "jimvio_command_center_pins_v1";
const MAX_PINS = 8;

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

export function isPinnedCommand(id: string): boolean {
  if (typeof window === "undefined") return false;
  return readPinnedCommands().some((p) => p.id === id);
}

/** Accepts either a bare id (static commands) or a full result (persists a display snapshot). */
export function togglePinnedCommand(item: string | CommandResult) {
  if (typeof window === "undefined") return readPinnedCommands();
  const id = typeof item === "string" ? item : item.id;
  const pins = readPinnedCommands();
  const exists = pins.some((p) => p.id === id);

  let next: PinnedCommand[];
  if (exists) {
    next = pins.filter((p) => p.id !== id);
  } else {
    const snapshot: PinnedCommand =
      typeof item === "string"
        ? { id, pinnedAt: Date.now() }
        : {
            id,
            pinnedAt: Date.now(),
            kind: item.kind,
            title: item.title,
            subtitle: item.subtitle,
            href: item.href,
            icon: item.icon,
            actionId: item.actionId,
          };
    next = [snapshot, ...pins].slice(0, MAX_PINS);
  }

  localStorage.setItem(PINS_KEY, JSON.stringify(next));
  return next;
}

export function getDefaultPinnedIds(): string[] {
  return ["open-ai", "search-marketplace", "trending-products"];
}

export function resolvePinnedCommands(): CommandResult[] {
  const stored = readPinnedCommands();

  if (stored.length === 0) {
    return getDefaultPinnedIds()
      .map((id) => getStaticCommandById(id))
      .filter((cmd): cmd is NonNullable<typeof cmd> => Boolean(cmd))
      .map((cmd) => ({ ...cmd, section: "pinned" as const }));
  }

  return stored
    .map((pin): CommandResult | null => {
      const staticCmd = getStaticCommandById(pin.id);
      if (staticCmd) return { ...staticCmd, section: "pinned" as const };
      if (!pin.title) return null;
      return {
        id: pin.id,
        kind: pin.kind ?? "command",
        title: pin.title,
        subtitle: pin.subtitle,
        href: pin.href,
        icon: pin.icon,
        actionId: pin.actionId,
        section: "pinned" as const,
      };
    })
    .filter((cmd): cmd is CommandResult => Boolean(cmd));
}
