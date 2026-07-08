/**
 * Dashboard layout preferences — Products Only mode (localStorage).
 */

export interface CjDashboardLayoutPrefs {
  hideIntelligenceMonitor: boolean;
  hideJimvioIntelligence: boolean;
  hideFilters: boolean;
  hideAutoPublishAnalytics: boolean;
  hideCatalogHealth: boolean;
  productsOnly: boolean;
}

const STORAGE_KEY = "cj-import-dashboard-prefs-v1";

export const DEFAULT_DASHBOARD_PREFS: CjDashboardLayoutPrefs = {
  hideIntelligenceMonitor: false,
  hideJimvioIntelligence: false,
  hideFilters: false,
  hideAutoPublishAnalytics: false,
  hideCatalogHealth: false,
  productsOnly: false,
};

export function loadDashboardPrefs(): CjDashboardLayoutPrefs {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DASHBOARD_PREFS;
    return { ...DEFAULT_DASHBOARD_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DASHBOARD_PREFS;
  }
}

export function saveDashboardPrefs(prefs: CjDashboardLayoutPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota errors
  }
}

export function applyProductsOnlyMode(): CjDashboardLayoutPrefs {
  return {
    hideIntelligenceMonitor: true,
    hideJimvioIntelligence: true,
    hideFilters: true,
    hideAutoPublishAnalytics: true,
    hideCatalogHealth: true,
    productsOnly: true,
  };
}

export function applyShowDashboardMode(): CjDashboardLayoutPrefs {
  return { ...DEFAULT_DASHBOARD_PREFS };
}
