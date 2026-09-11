/**
 * Record a Playwright page to .webm via CDP screencast + Playwright's ffmpeg.
 * Used when Chrome is attached over CDP (page.video() is unavailable).
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

function resolvePlaywrightFfmpeg() {
  const fromEnv = process.env.PLAYWRIGHT_FFMPEG_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  try {
    const require = createRequire(import.meta.url);
    // playwright-core exposes registry helpers in recent versions
    const pw = require("playwright-core/lib/server/registry/index");
    if (typeof pw?.registry?.findExecutable === "function") {
      const exe = pw.registry.findExecutable("ffmpeg");
      const p = exe?.executablePath?.();
      if (p && fs.existsSync(p)) return p;
    }
  } catch {
    /* fall through */
  }

  // Common Cursor/Playwright cache layout on macOS
  const home = process.env.HOME || "";
  const cacheRoots = [
    path.join(home, "Library/Caches/ms-playwright"),
    path.join(home, ".cache/ms-playwright"),
    process.env.PLAYWRIGHT_BROWSERS_PATH || "",
  ].filter(Boolean);

  for (const root of cacheRoots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (/ffmpeg/i.test(ent.name)) stack.push(full);
          else if (!/chromium|webkit|firefox|winldd/i.test(ent.name)) {
            // shallow scan only ffmpeg* dirs
          }
        } else if (/^ffmpeg/i.test(ent.name) && fs.statSync(full).isFile()) {
          return full;
        }
      }
      // also direct children named ffmpeg*
      for (const ent of entries) {
        if (ent.isDirectory() && /ffmpeg/i.test(ent.name)) {
          const nested = fs.readdirSync(path.join(dir, ent.name));
          for (const n of nested) {
            if (/^ffmpeg/i.test(n)) {
              const full = path.join(dir, ent.name, n);
              if (fs.existsSync(full)) return full;
            }
          }
        }
      }
    }
  }

  throw new Error(
    "Playwright ffmpeg binary not found. Run: npx playwright install ffmpeg"
  );
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} outputPath
 */
export async function startCdpVideo(page, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const ffmpegPath = resolvePlaywrightFfmpeg();
  const session = await page.context().newCDPSession(page);

  const ff = spawn(
    ffmpegPath,
    [
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-avioflags",
      "direct",
      "-fpsprobesize",
      "0",
      "-probesize",
      "32",
      "-analyzeduration",
      "0",
      "-c:v",
      "mjpeg",
      "-i",
      "pipe:0",
      "-y",
      "-an",
      "-r",
      "12",
      "-c:v",
      "vp8",
      "-qmin",
      "0",
      "-qmax",
      "50",
      "-crf",
      "10",
      "-b:v",
      "1M",
      "-threads",
      "1",
      outputPath,
    ],
    { stdio: ["pipe", "ignore", "pipe"] }
  );

  let ffErr = "";
  ff.stderr?.on("data", (d) => {
    ffErr += String(d);
  });

  let writing = true;
  session.on("Page.screencastFrame", async (frame) => {
    try {
      if (!writing || !ff.stdin || ff.stdin.destroyed) return;
      const buf = Buffer.from(frame.data, "base64");
      const ok = ff.stdin.write(buf);
      if (!ok) {
        await new Promise((r) => ff.stdin.once("drain", r));
      }
      await session
        .send("Page.screencastFrameAck", { sessionId: frame.sessionId })
        .catch(() => undefined);
    } catch {
      /* ignore frame errors during teardown */
    }
  });

  await session.send("Page.startScreencast", {
    format: "jpeg",
    quality: 72,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1,
  });

  return {
    path: outputPath,
    async stop() {
      writing = false;
      try {
        await session.send("Page.stopScreencast");
      } catch {
        /* ignore */
      }
      try {
        ff.stdin?.end();
      } catch {
        /* ignore */
      }
      await new Promise((resolve) => {
        const t = setTimeout(resolve, 8000);
        ff.once("close", () => {
          clearTimeout(t);
          resolve();
        });
      });
      try {
        await session.detach();
      } catch {
        /* ignore */
      }
      if (ffErr.trim()) {
        // Non-fatal: keep path if file exists
      }
      return fs.existsSync(outputPath) ? outputPath : null;
    },
  };
}
