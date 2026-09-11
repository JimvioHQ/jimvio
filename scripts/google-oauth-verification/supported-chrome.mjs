/**
 * Launch the user's installed Google Chrome as a normal OS process, then
 * attach Playwright over CDP.
 *
 * Why: Playwright's launchPersistentContext(channel:"chrome") still starts
 * Chrome with automation flags (--enable-automation, etc.). Google account
 * password entry then shows "This browser or app may not be secure."
 *
 * This launcher does NOT:
 * - spoof user-agent
 * - hide/patch navigator.webdriver
 * - add AutomationControlled evasions
 * - use --no-sandbox
 *
 * It only starts real Chrome with a dedicated user-data-dir + remote debugging.
 */

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };

export function resolveChromeExecutable() {
  const fromEnv = process.env.DEMO_CHROME_EXECUTABLE?.trim();
  if (fromEnv) {
    if (!fs.existsSync(fromEnv)) {
      throw new Error(
        `DEMO_CHROME_EXECUTABLE not found: ${fromEnv}\nInstall Google Chrome or unset the override.`
      );
    }
    return fromEnv;
  }

  if (process.platform === "darwin") {
    const mac =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (fs.existsSync(mac)) return mac;
  }

  if (process.platform === "win32") {
    const candidates = [
      path.join(
        process.env.PROGRAMFILES || "C:\\\\Program Files",
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
      path.join(
        process.env["PROGRAMFILES(X86)"] || "C:\\\\Program Files (x86)",
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
      path.join(
        process.env.LOCALAPPDATA || "",
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
  }

  // Linux
  for (const name of [
    "google-chrome-stable",
    "google-chrome",
    "chrome",
  ]) {
    try {
      const which = spawn("which", [name], { encoding: "utf8" });
      // sync-friendly check via fs of common paths below
    } catch {
      /* ignore */
    }
  }
  for (const c of [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chrome",
    "/snap/bin/chromium",
  ]) {
    // Prefer google-chrome* only — Chromium alone is often rejected by Google.
    if (c.includes("google-chrome") && fs.existsSync(c)) return c;
  }

  throw new Error(
    [
      "Installed Google Chrome was not found.",
      "Install stable Google Chrome, then re-run.",
      "Optional override: DEMO_CHROME_EXECUTABLE=/path/to/Google Chrome",
      "Do not use Playwright's bundled Chromium for this OAuth demo.",
    ].join("\n")
  );
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

export async function findFreePort(start = 9222) {
  const preferred = Number(process.env.DEMO_CDP_PORT || start);
  for (let p = preferred; p < preferred + 40; p++) {
    if (await canListen(p)) return p;
  }
  throw new Error("No free localhost port for Chrome remote debugging");
}

async function waitForCdp(port, timeoutMs = 45_000) {
  const started = Date.now();
  let lastErr = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        const json = await res.json();
        return json;
      }
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `Chrome CDP did not become ready on port ${port} (${lastErr})`
  );
}

/**
 * @returns {Promise<{
 *   browser: import('@playwright/test').Browser,
 *   context: import('@playwright/test').BrowserContext,
 *   page: import('@playwright/test').Page,
 *   chromeProcess: import('node:child_process').ChildProcess,
 *   executable: string,
 *   endpoint: string,
 *   port: number,
 *   profileDir: string,
 *   close: () => Promise<void>,
 * }>}
 */
export async function launchSupportedChrome({
  profileDir,
  viewport = DEFAULT_VIEWPORT,
} = {}) {
  if (!profileDir) {
    throw new Error("profileDir is required for supported Chrome launch");
  }
  fs.mkdirSync(profileDir, { recursive: true });

  const executable = resolveChromeExecutable();
  const port = await findFreePort(9222);
  const endpoint = `http://127.0.0.1:${port}`;

  // Legitimate Chrome flags only — no sandbox disable, no automation evasions.
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    `--window-size=${viewport.width},${viewport.height}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    "about:blank",
  ];

  const chromeProcess = spawn(executable, args, {
    stdio: "ignore",
    detached: false,
  });

  let spawnedExited = false;
  chromeProcess.once("exit", () => {
    spawnedExited = true;
  });

  try {
    const version = await waitForCdp(port);
    if (spawnedExited) {
      throw new Error("Chrome exited before CDP became ready");
    }

    const browser = await chromium.connectOverCDP(endpoint);
    const context = browser.contexts()[0] || (await browser.newContext());
    const page = context.pages()[0] || (await context.newPage());
    try {
      await page.setViewportSize(viewport);
    } catch {
      /* window-size already applied */
    }

    const close = async () => {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
      if (!chromeProcess.killed) {
        try {
          chromeProcess.kill("SIGTERM");
        } catch {
          /* ignore */
        }
        // Ensure the OS Chrome process exits so the next run can reuse the profile.
        await new Promise((r) => setTimeout(r, 500));
        try {
          chromeProcess.kill("SIGKILL");
        } catch {
          /* ignore */
        }
      }
    };

    return {
      browser,
      context,
      page,
      chromeProcess,
      executable,
      endpoint,
      port,
      profileDir,
      browserVersion: version?.Browser || version?.webSocketDebuggerUrl || "unknown",
      close,
    };
  } catch (err) {
    try {
      chromeProcess.kill("SIGKILL");
    } catch {
      /* ignore */
    }
    throw err;
  }
}

export function assertNoUnsupportedFlags(chromeArgs) {
  const joined = chromeArgs.join(" ");
  const bad = [];
  if (/\b--no-sandbox\b/.test(joined)) bad.push("--no-sandbox");
  if (/AutomationControlled/i.test(joined)) bad.push("AutomationControlled");
  if (/\b--disable-web-security\b/.test(joined)) bad.push("--disable-web-security");
  return bad;
}
