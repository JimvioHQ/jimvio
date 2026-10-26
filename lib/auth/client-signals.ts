/**
 * Browser and OS names parsed from a request User-Agent.
 * The raw string is not stored. This is not a device fingerprint.
 */

export type ClientSignals = {
  category: "mobile" | "tablet" | "desktop" | "unknown";
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceLabel: string;
};

function shortVersion(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split(".").filter(Boolean).slice(0, 2);
  return parts.length ? parts.join(".") : null;
}

function matchVersion(userAgent: string, pattern: RegExp): string | null {
  return shortVersion(userAgent.match(pattern)?.[1]);
}

export function parseDevice(userAgent: string): string {
  const ua = userAgent || "Unknown browser";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/iPhone|iPad/i.test(ua)) return /CriOS/i.test(ua) ? "Chrome on iOS" : "Safari on iOS";
  if (/Android/i.test(ua)) return /Chrome/i.test(ua) ? "Chrome on Android" : "Android browser";
  if (/Mac OS X/i.test(ua)) return /Chrome/i.test(ua) ? "Chrome on macOS" : "Safari on macOS";
  if (/Windows/i.test(ua)) return /Chrome/i.test(ua) ? "Chrome on Windows" : "Browser on Windows";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Chrome/i.test(ua)) return "Chrome";
  return "Web browser";
}

export function parseClientSignals(userAgent: string): ClientSignals {
  const ua = userAgent || "";
  const deviceLabel = parseDevice(ua);
  let category: ClientSignals["category"] = "desktop";
  if (!ua.trim()) category = "unknown";
  else if (/iPad|Tablet/i.test(ua)) category = "tablet";
  else if (/Android/i.test(ua) && !/Mobile/i.test(ua)) category = "tablet";
  else if (/iPhone|Android|Mobile/i.test(ua)) category = "mobile";
  else if (deviceLabel === "Web browser") category = "unknown";

  let browser: string | null = null;
  let browserVersion: string | null = null;
  if (/Edg\//i.test(ua)) {
    browser = "Edge";
    browserVersion = matchVersion(ua, /Edg\/(\d+(?:\.\d+)?)/i);
  } else if (/CriOS/i.test(ua)) {
    browser = "Chrome";
    browserVersion = matchVersion(ua, /CriOS\/(\d+(?:\.\d+)?)/i);
  } else if (/FxiOS/i.test(ua)) {
    browser = "Firefox";
    browserVersion = matchVersion(ua, /FxiOS\/(\d+(?:\.\d+)?)/i);
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
    browserVersion = matchVersion(ua, /Firefox\/(\d+(?:\.\d+)?)/i);
  } else if (/Chrome\//i.test(ua)) {
    browser = "Chrome";
    browserVersion = matchVersion(ua, /Chrome\/(\d+(?:\.\d+)?)/i);
  } else if (/Version\/[\d.]+.*Safari\//i.test(ua)) {
    browser = "Safari";
    browserVersion = matchVersion(ua, /Version\/(\d+(?:\.\d+)?)/i);
  }

  let os: string | null = null;
  let osVersion: string | null = null;
  const ios = ua.match(/(?:iPhone OS|CPU OS) (\d+(?:_\d+)*)/i);
  const android = ua.match(/Android (\d+(?:\.\d+)?)/i);
  const mac = ua.match(/Mac OS X (\d+(?:[._]\d+)*)/i);
  const windows = ua.match(/Windows NT (\d+\.\d+)/i);
  if (ios?.[1]) {
    os = "iOS";
    osVersion = shortVersion(ios[1].replace(/_/g, "."));
  } else if (android?.[1]) {
    os = "Android";
    osVersion = shortVersion(android[1]);
  } else if (mac?.[1] && !/iPhone|iPad/i.test(ua)) {
    os = "macOS";
    osVersion = shortVersion(mac[1].replace(/_/g, "."));
  } else if (windows?.[1]) {
    os = "Windows";
    osVersion = windows[1] === "10.0" ? "10" : shortVersion(windows[1]);
  }

  return { category, browser, browserVersion, os, osVersion, deviceLabel };
}
