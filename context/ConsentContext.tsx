"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { detectBrowserCountry } from "@/lib/geo/buyer-country";
import {
  ALL_GRANTED,
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
  NONE_GRANTED,
  defaultConsentForRegime,
  isStoredConsentCurrent,
  regimeForCountry,
  requiresPriorConsent,
  type ConsentAction,
  type ConsentRegime,
  type ConsentState,
  type StoredConsent,
} from "@/lib/compliance/regions";

/** Fired by any component (e.g. footer "Manage cookies") to reopen the preferences UI. */
export const OPEN_CONSENT_EVENT = "jimvio:open-consent";

type ConsentContextValue = {
  /** True once client-side resolution has run (avoid gating analytics during SSR/hydration). */
  ready: boolean;
  regime: ConsentRegime;
  region: string | null;
  consent: ConsentState;
  /** A stored, current-version decision exists. */
  decided: boolean;
  /** Whether the banner should be visible. */
  showBanner: boolean;
  preferencesOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (next: Partial<ConsentState>) => void;
  doNotSell: () => void;
  withdraw: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
  dismissBanner: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStored(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredConsent;
  } catch {
    /* ignore */
  }
  // Fallback to cookie (survives localStorage clears / cross-tab reads).
  try {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${CONSENT_STORAGE_KEY}=`));
    if (match) return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("="))) as StoredConsent;
  } catch {
    /* ignore */
  }
  return null;
}

function persistStored(stored: StoredConsent) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(stored);
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serialized);
  } catch {
    /* ignore */
  }
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${CONSENT_STORAGE_KEY}=${encodeURIComponent(
      serialized,
    )}; Path=/; Max-Age=${oneYear}; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}

function recordConsentAudit(stored: StoredConsent, action: ConsentAction) {
  // Best-effort audit trail; never blocks or breaks the UI.
  try {
    void fetch("/api/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        regime: stored.regime,
        region: stored.region,
        policyVersion: stored.v,
        analytics: stored.analytics,
        personalization: stored.personalization,
        marketing: stored.marketing,
        action,
      }),
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [regime, setRegime] = useState<ConsentRegime>("default");
  const [region, setRegion] = useState<string | null>(null);
  const [consent, setConsent] = useState<ConsentState>(NONE_GRANTED);
  const [decided, setDecided] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Resolve region + stored decision on the client (keeps pages statically renderable).
  useEffect(() => {
    const country = detectBrowserCountry("");
    const resolvedRegime = regimeForCountry(country || null);
    setRegion(country || null);
    setRegime(resolvedRegime);

    const stored = readStored();
    if (isStoredConsentCurrent(stored)) {
      setConsent({
        analytics: stored.analytics,
        personalization: stored.personalization,
        marketing: stored.marketing,
      });
      setDecided(true);
    } else {
      setConsent(defaultConsentForRegime(resolvedRegime));
      setDecided(false);
    }
    setReady(true);
  }, []);

  const commit = useCallback(
    (next: ConsentState, action: ConsentAction) => {
      const stored: StoredConsent = {
        ...next,
        v: CONSENT_POLICY_VERSION,
        regime,
        region,
        decidedAt: new Date().toISOString(),
      };
      setConsent(next);
      setDecided(true);
      setPreferencesOpen(false);
      persistStored(stored);
      recordConsentAudit(stored, action);
    },
    [regime, region],
  );

  const acceptAll = useCallback(() => commit(ALL_GRANTED, "accept_all"), [commit]);
  const rejectAll = useCallback(() => commit(NONE_GRANTED, "reject_all"), [commit]);
  const doNotSell = useCallback(() => commit(NONE_GRANTED, "do_not_sell"), [commit]);
  const withdraw = useCallback(() => commit(NONE_GRANTED, "withdraw"), [commit]);
  const save = useCallback(
    (next: Partial<ConsentState>) => commit({ ...consent, ...next }, "save"),
    [commit, consent],
  );

  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);
  const dismissBanner = useCallback(() => {
    // For opt-out/informational regimes, dismissing accepts the (allowed) defaults.
    if (!requiresPriorConsent(regime)) commit(consent, "save");
  }, [commit, consent, regime]);

  // Allow any component to reopen the preferences dialog via a window event.
  useEffect(() => {
    const handler = () => setPreferencesOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, handler);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, handler);
  }, []);

  const showBanner = ready && !decided;

  const value = useMemo<ConsentContextValue>(
    () => ({
      ready,
      regime,
      region,
      consent,
      decided,
      showBanner,
      preferencesOpen,
      acceptAll,
      rejectAll,
      save,
      doNotSell,
      withdraw,
      openPreferences,
      closePreferences,
      dismissBanner,
    }),
    [
      ready, regime, region, consent, decided, showBanner, preferencesOpen,
      acceptAll, rejectAll, save, doNotSell, withdraw, openPreferences,
      closePreferences, dismissBanner,
    ],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

/** Safe outside a provider: reports "not ready" with all non-essential consent denied. */
export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    return {
      ready: false,
      regime: "default",
      region: null,
      consent: NONE_GRANTED,
      decided: false,
      showBanner: false,
      preferencesOpen: false,
      acceptAll: () => {},
      rejectAll: () => {},
      save: () => {},
      doNotSell: () => {},
      withdraw: () => {},
      openPreferences: () => {},
      closePreferences: () => {},
      dismissBanner: () => {},
    };
  }
  return ctx;
}

/** Dispatch anywhere (e.g. a footer link) to reopen cookie preferences. */
export function openConsentPreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
  }
}
