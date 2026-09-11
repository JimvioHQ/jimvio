#!/usr/bin/env node
/**
 * Post-recording inspection for Google OAuth verification video.
 * Uses checklist.json + optional ffprobe. Does not invent evidence.
 *
 * Usage:
 *   node scripts/google-oauth-verification/inspect-recording.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const OUT_DIR = path.resolve(
  process.cwd(),
  process.env.DEMO_OUT_DIR || "tmp/google-oauth-verification"
);

const required = [
  ["jimvioHomepage", "Jimvio homepage"],
  ["jimvioBranding", "Jimvio branding"],
  ["authenticatedApp", "Authenticated application"],
  ["settings", "Settings"],
  ["liveDestinations", "Live Destinations"],
  ["connectYouTube", "Connect YouTube"],
  ["realGoogleOauthPage", "REAL Google OAuth page"],
  ["completeConsentScreen", "COMPLETE OAuth Consent Screen"],
  ["englishConsent", "English consent screen"],
  ["youtubePermissionVisible", "Requested YouTube permission"],
  ["authorizationAction", "Authorization action"],
  ["callback", "Callback"],
  ["youtubeConnected", "YouTube Connected"],
  ["liveStudio", "Live Studio"],
  ["youtubeDestination", "YouTube destination"],
  ["youtubeFunctionality", "Actual YouTube functionality"],
  ["disconnect", "Disconnect"],
];

function main() {
  const checklistPath = path.join(OUT_DIR, "checklist.json");
  const reportPath = path.join(OUT_DIR, "run-report.json");
  if (!fs.existsSync(checklistPath)) {
    console.error(`Missing ${checklistPath} — run the recorder first.`);
    process.exit(1);
  }
  const checklist = JSON.parse(fs.readFileSync(checklistPath, "utf8"));
  const report = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath, "utf8"))
    : {};

  const video =
    report.videoPath ||
    path.join(OUT_DIR, "jimvio-youtube-oauth-verification.webm");

  let media = null;
  if (fs.existsSync(video)) {
    const probe = spawnSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,duration:format=duration",
        "-of",
        "json",
        video,
      ],
      { encoding: "utf8" }
    );
    if (probe.status === 0) {
      try {
        media = JSON.parse(probe.stdout);
      } catch {
        media = null;
      }
    } else {
      console.log("ffprobe unavailable — skipped duration/resolution probe");
    }
  } else {
    console.log(`Video file missing: ${video}`);
  }

  console.log("\nGoogle OAuth verification — automated checklist inspection\n");
  let failed = 0;
  for (const [key, label] of required) {
    const ok = Boolean(checklist[key]);
    console.log(`${ok ? "✓" : "✗"} ${label}`);
    if (!ok) failed += 1;
  }

  if (checklist.youtubeResult) {
    console.log("✓ Real YouTube result (Studio) captured");
  } else {
    console.log("○ YouTube Studio result not confirmed (optional if Live Studio shows API-driven destination state)");
  }

  if (checklist.secretsVisible) {
    console.log("✗ Secrets flagged in checklist — DO NOT submit");
    failed += 1;
  } else {
    console.log("✓ No secrets flagged by recorder checklist");
  }

  if (media?.streams?.[0]) {
    const s = media.streams[0];
    const dur = Number(media.format?.duration || s.duration || 0);
    console.log(
      `\nMedia: ${s.width}x${s.height}, ~${dur ? `${Math.round(dur)}s` : "duration unknown"}`
    );
    if (s.width < 1280 || s.height < 720) {
      console.log("✗ Resolution below 720p target");
      failed += 1;
    } else {
      console.log("✓ Resolution meets ≥720p (prefer 1080p)");
    }
    if (dur && (dur < 180 || dur > 480)) {
      console.log(
        `○ Duration ${Math.round(dur)}s outside preferred 4–6 min band — review manually`
      );
    }
  }

  const framesDir = path.join(OUT_DIR, "frames");
  if (fs.existsSync(framesDir)) {
    const frames = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png"));
    console.log(`\nFrames captured: ${frames.length}`);
    for (const f of frames.sort()) console.log(` - ${f}`);
  }

  if (checklist.blockers?.length) {
    console.log("\nBlockers:");
    for (const b of checklist.blockers) console.log(` - ${b}`);
    failed += checklist.blockers.length;
  }

  const out = {
    failed,
    video: fs.existsSync(video) ? video : null,
    media,
    checklist,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "inspection.json"),
    JSON.stringify(out, null, 2)
  );

  console.log(
    failed
      ? `\nINSPECTION FAILED (${failed}) — re-record before Google submission`
      : "\nINSPECTION PASSED checklist gates — still manually re-watch consent frames before upload"
  );
  process.exit(failed ? 1 : 0);
}

main();
