"use client";

import { useCallback, useEffect, useState } from "react";
import { useClientReady } from "@/lib/community/use-client-ready";

const STORAGE_KEY = "jimvio.workspace.favorites.v1";

type FavMap = Record<string, true>;

function readMap(): FavMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as FavMap;
  } catch {
    return {};
  }
}

function writeMap(map: FavMap) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

function favKey(kind: "group" | "channel", id: string) {
  return `${kind}:${id}`;
}

/**
 * Client-only favorites for groups/channels — no API, no duplicate stores.
 */
export function useWorkspaceFavorites() {
  const ready = useClientReady();
  const [map, setMap] = useState<FavMap>({});

  useEffect(() => {
    if (!ready) return;
    setMap(readMap());
  }, [ready]);

  const isFavorite = useCallback(
    (kind: "group" | "channel", id: string) =>
      ready ? Boolean(map[favKey(kind, id)]) : false,
    [map, ready]
  );

  const toggleFavorite = useCallback((kind: "group" | "channel", id: string) => {
    setMap((prev) => {
      const key = favKey(kind, id);
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      writeMap(next);
      return next;
    });
  }, []);

  return { ready, isFavorite, toggleFavorite };
}
