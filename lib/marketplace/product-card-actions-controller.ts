/** Ephemeral open-card overlay state for mobile marketplace cards (not persisted). */

type Listener = (openProductId: string | null) => void;

let openProductId: string | null = null;
const listeners = new Set<Listener>();

export function getOpenProductCardActionsId(): string | null {
  return openProductId;
}

export function setOpenProductCardActionsId(id: string | null): void {
  if (openProductId === id) return;
  openProductId = id;
  listeners.forEach((listener) => listener(openProductId));
}

export function subscribeOpenProductCardActions(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
