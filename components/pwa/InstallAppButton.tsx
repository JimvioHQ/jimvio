"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Mode = "unknown" | "prompt" | "ios" | "installed" | "manual";

/**
 * Install Jimvio as an app (P0-8).
 *
 * Jimvio ships as a web app (app/manifest.ts), not in the App Store or
 * Google Play. This replaces store badges that linked to "#" with a real
 * install path: the browser install prompt where supported, and the
 * Add to Home Screen steps on iOS Safari.
 */
export function InstallAppButton() {
  const [mode, setMode] = useState<Mode>("unknown");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- display mode is browser-only
      setMode("installed");
      return;
    }
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    setMode(isIos ? "ios" : "manual");

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("prompt");
    };
    const onInstalled = () => setMode("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const buttonClass =
    "inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#111827] px-5 text-[14px] font-bold text-white transition hover:bg-black active:scale-[0.98] motion-reduce:active:scale-100";

  if (mode === "installed") {
    return (
      <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-emerald-600">
        <Smartphone className="size-4" aria-hidden /> Jimvio is installed on this device.
      </p>
    );
  }

  if (mode === "prompt" && deferred) {
    return (
      <button
        type="button"
        className={buttonClass}
        onClick={async () => {
          await deferred.prompt();
          const choice = await deferred.userChoice;
          if (choice.outcome === "accepted") setMode("installed");
          setDeferred(null);
        }}
      >
        <Download className="size-4" aria-hidden /> Install the Jimvio app
      </button>
    );
  }

  if (mode === "ios") {
    return (
      <div>
        <button type="button" className={buttonClass} onClick={() => setShowIosHelp((v) => !v)} aria-expanded={showIosHelp}>
          <Download className="size-4" aria-hidden /> Add Jimvio to your Home Screen
        </button>
        {showIosHelp ? (
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[#4B5563]">
            In Safari, tap <Share className="size-3.5" aria-label="Share" /> then &ldquo;Add to Home Screen&rdquo;.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <p className="text-[13px] leading-relaxed text-[#4B5563]">
      Open jimvio.com in Chrome, Edge or Safari on your phone and choose
      &ldquo;Install app&rdquo; or &ldquo;Add to Home Screen&rdquo;.
    </p>
  );
}
