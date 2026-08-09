/**
 * Jimvio Creator OS — Mission Control widget layout (UI-only localStorage helper).
 * Lets a user hide/reorder Mission Control sections. Presentation preference only —
 * no auth/API/DB reads or writes, everything lives in the browser.
 */

export type WidgetId =
  | "brief"
  | "smartPins"
  | "intelligence"
  | "executive"
  | "health"
  | "opportunities"
  | "risks"
  | "growth"
  | "dna"
  | "timeline"
  | "collaboration"
  | "focus"
  | "continue"
  | "quickActions"
  | "insights"
  | "calendar"
  | "activity";

export type WidgetLayout = {
  order: WidgetId[];
  hidden: WidgetId[];
};

const STORAGE_KEY = "jimvio-os-mc-widgets-v1";

/** Widgets hidden by default — kept available in the customizer, just not shown out of the box. */
const DEFAULT_HIDDEN_WIDGETS: WidgetId[] = ["activity"];

/** Canonical default order — matches the natural Mission Control reading order. */
export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  "brief",
  "smartPins",
  "executive",
  "health",
  "opportunities",
  "risks",
  "growth",
  "dna",
  "collaboration",
  "intelligence",
  "focus",
  "continue",
  "quickActions",
  "insights",
  "calendar",
  "timeline",
  "activity",
];

export const WIDGET_LABELS: Record<WidgetId, string> = {
  brief: "AI Daily Brief",
  smartPins: "Smart Pins",
  intelligence: "Intelligence Core",
  executive: "Executive Agent",
  health: "Business Health",
  opportunities: "Opportunity Engine",
  risks: "Risk Engine",
  growth: "Growth Engine",
  dna: "Business DNA",
  timeline: "Business Timeline",
  collaboration: "Agent Collaboration",
  focus: "Today's Focus",
  continue: "Continue Working",
  quickActions: "Quick Actions",
  insights: "Insights",
  calendar: "Smart Calendar",
  activity: "Activity Center",
};

function isWidgetId(value: unknown): value is WidgetId {
  return typeof value === "string" && (DEFAULT_WIDGET_ORDER as string[]).includes(value);
}

/** Stable default — required for useSyncExternalStore (Object.is snapshot identity). */
const DEFAULT_LAYOUT: WidgetLayout = {
  order: DEFAULT_WIDGET_ORDER,
  hidden: DEFAULT_HIDDEN_WIDGETS,
};

function defaultLayout(): WidgetLayout {
  return DEFAULT_LAYOUT;
}

/** Merges any previously-unknown widget ids to the end, guarding against stale/partial storage. */
function sanitizeLayout(raw: unknown): WidgetLayout {
  if (!raw || typeof raw !== "object") return defaultLayout();
  const parsed = raw as { order?: unknown; hidden?: unknown };
  const rawOrder = Array.isArray(parsed.order) ? parsed.order.filter(isWidgetId) : [];
  const missing = DEFAULT_WIDGET_ORDER.filter((id) => !rawOrder.includes(id));
  const order = [...rawOrder, ...missing];
  const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter(isWidgetId) : [];
  // Return the shared default when storage matches defaults — keeps snapshot identity stable.
  if (
    order.length === DEFAULT_WIDGET_ORDER.length &&
    order.every((id, i) => id === DEFAULT_WIDGET_ORDER[i]) &&
    hidden.length === DEFAULT_HIDDEN_WIDGETS.length &&
    hidden.every((id, i) => id === DEFAULT_HIDDEN_WIDGETS[i])
  ) {
    return DEFAULT_LAYOUT;
  }
  return { order, hidden };
}

/** Cache so getSnapshot returns a referentially stable object until storage changes. */
let cachedRaw: string | null | undefined;
let cachedLayout: WidgetLayout = DEFAULT_LAYOUT;

export function loadWidgetLayout(): WidgetLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedLayout;
    cachedRaw = raw;
    cachedLayout = raw ? sanitizeLayout(JSON.parse(raw)) : DEFAULT_LAYOUT;
    return cachedLayout;
  } catch {
    cachedRaw = null;
    cachedLayout = DEFAULT_LAYOUT;
    return DEFAULT_LAYOUT;
  }
}

export function saveWidgetLayout(layout: WidgetLayout): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(layout);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedLayout = layout;
    window.dispatchEvent(new Event("jimvio-os-widget-layout"));
  } catch {
    /* silent */
  }
}

export function resetWidgetLayout(): WidgetLayout {
  const layout = defaultLayout();
  saveWidgetLayout(layout);
  return layout;
}

export function toggleWidgetHidden(layout: WidgetLayout, id: WidgetId): WidgetLayout {
  const hidden = layout.hidden.includes(id)
    ? layout.hidden.filter((h) => h !== id)
    : [...layout.hidden, id];
  const next: WidgetLayout = { ...layout, hidden };
  saveWidgetLayout(next);
  return next;
}

export function moveWidget(layout: WidgetLayout, id: WidgetId, direction: "up" | "down"): WidgetLayout {
  const index = layout.order.indexOf(id);
  if (index === -1) return layout;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= layout.order.length) return layout;
  const order = [...layout.order];
  [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  const next: WidgetLayout = { ...layout, order };
  saveWidgetLayout(next);
  return next;
}
