/**
 * Jimvio Creator OS — layout memory (UI-only localStorage helpers).
 * Stores presentation preferences like pinned pages and layout choices.
 * No auth/API/DB reads or writes — everything lives in the browser.
 */

const PINNED_PROJECTS_KEY = "jimvio-os-pinned-projects-v1";
const PREFERRED_LAYOUT_KEY = "jimvio-os-preferred-layout-v1";
const MAX_PINNED_PROJECTS = 12;

export type OsPinnedProject = {
  href: string;
  label: string;
  pinnedAt: number;
};

export type OsPreferredLayout = {
  /** Whether the "Classic dashboard" section starts expanded on /dashboard. */
  dashboardClassicExpanded?: boolean;
  /** Last sidebar collapse preference, mirrored for cross-surface reads. */
  sidebarCollapsed?: boolean;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* silent */
  }
}

export function loadPinnedProjects(): OsPinnedProject[] {
  return readJson<OsPinnedProject[]>(PINNED_PROJECTS_KEY, []);
}

export function savePinnedProjects(items: OsPinnedProject[]) {
  writeJson(PINNED_PROJECTS_KEY, items);
}

export function isProjectPinned(href: string): boolean {
  return loadPinnedProjects().some((p) => p.href === href);
}

/** Pin or unpin a page (toggled by href). Returns the updated list. */
export function togglePinnedProject(project: Omit<OsPinnedProject, "pinnedAt">): OsPinnedProject[] {
  const current = loadPinnedProjects();
  const exists = current.some((p) => p.href === project.href);
  const next = exists
    ? current.filter((p) => p.href !== project.href)
    : [{ ...project, pinnedAt: Date.now() }, ...current].slice(0, MAX_PINNED_PROJECTS);
  savePinnedProjects(next);
  return next;
}

export function loadPreferredLayout(): OsPreferredLayout {
  return readJson<OsPreferredLayout>(PREFERRED_LAYOUT_KEY, {});
}

export function savePreferredLayout(patch: Partial<OsPreferredLayout>): OsPreferredLayout {
  const next = { ...loadPreferredLayout(), ...patch };
  writeJson(PREFERRED_LAYOUT_KEY, next);
  return next;
}
