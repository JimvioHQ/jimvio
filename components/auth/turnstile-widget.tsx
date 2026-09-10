"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onJimvioTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-api";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onJimvioTurnstileLoad";

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    return new Promise((resolve) => {
      window.onJimvioTurnstileLoad = () => resolve();
      if (window.turnstile) resolve();
    });
  }

  return new Promise((resolve, reject) => {
    window.onJimvioTurnstileLoad = () => resolve();
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load CAPTCHA"));
    document.head.appendChild(script);
  });
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
  /** Increment to force a widget reset after auth failure / expired token. */
  resetSignal?: number;
  className?: string;
};

/**
 * Cloudflare Turnstile widget. Passes the real token to the parent;
 * never reports success via a boolean bypass.
 */
export function TurnstileWidget({
  onToken,
  resetSignal = 0,
  className,
}: TurnstileWidgetProps) {
  const siteKey = getTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reactId = useId();

  const reset = useCallback(() => {
    onToken(null);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        /* ignore */
      }
    }
  }, [onToken]);

  useEffect(() => {
    if (resetSignal > 0) reset();
  }, [resetSignal, reset]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            /* ignore */
          }
          widgetIdRef.current = null;
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          size: "flexible",
          callback: (token: string) => {
            setError(null);
            onToken(token);
          },
          "error-callback": () => {
            setError("CAPTCHA failed. Please try again.");
            onToken(null);
          },
          "expired-callback": () => {
            setError("CAPTCHA expired. Please complete it again.");
            onToken(null);
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load CAPTCHA. Refresh and try again.");
          onToken(null);
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken, reactId]);

  if (!siteKey) {
    return (
      <p
        className="text-[12px] font-medium text-amber-700 dark:text-amber-300"
        role="status"
      >
        CAPTCHA is required but NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured.
      </p>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} data-testid="turnstile-widget" />
      {error && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[12px] font-medium text-red-600" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="text-[12px] font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 rounded-sm"
            onClick={reset}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
