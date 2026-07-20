/**
 * Live Studio RC6 — production release runbook gate report.
 * Run: node --experimental-strip-types scripts/verify-live-studio-rc6.ts
 *
 * Optional: LIVE_HEALTH_URL=http://localhost:3000/api/live/health
 * Optional: LIVE_E2E_STORAGE_STATE for Playwright readiness signal
 */

import fs from "node:fs";
import path from "node:path";
import {
  canEndLive,
  canPublishAv,
  canRecord,
  canInviteSpeaker,
  canMuteParticipant,
  canRemoveSpeaker,
  canLaunchPoll,
} from "../lib/live/roles.ts";
import { getLiveStudioEnvReport } from "../lib/live/env.ts";

type Gate = { id: string; step: number; status: "PASS" | "FAIL" | "BLOCKED"; detail: string };

function loadEnvLocal(): void {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

function fileGate(rel: string, id: string, step: number): Gate {
  const ok = fs.existsSync(path.join(process.cwd(), rel));
  return { id, step, status: ok ? "PASS" : "FAIL", detail: ok ? rel : `missing ${rel}` };
}

async function healthGate(step: number): Promise<Gate> {
  const url = process.env.LIVE_HEALTH_URL?.trim() || "http://localhost:3000/api/live/health";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      missing?: string[];
    };
    if (res.status === 200 && body.ok) {
      return { id: "health.endpoint", step, status: "PASS", detail: `${url} → healthy` };
    }
    return {
      id: "health.endpoint",
      step,
      status: "BLOCKED",
      detail: `${url} → ${res.status} missing=${(body.missing ?? []).join(",") || "n/a"}`,
    };
  } catch {
    return {
      id: "health.endpoint",
      step,
      status: "BLOCKED",
      detail: `${url} unreachable — start the app, then re-run`,
    };
  }
}

async function main() {
  loadEnvLocal();
  const gates: Gate[] = [];
  const env = getLiveStudioEnvReport();

  // STEP 1 — Environment
  gates.push({
    id: "env.livekit_cloudinary",
    step: 1,
    status: env.ok ? "PASS" : "BLOCKED",
    detail: env.ok
      ? `All required vars present (${env.present.length})`
      : `Missing local: ${env.missing.join(", ")} — also set Preview + Production`,
  });
  gates.push({
    id: "env.preview_production",
    step: 1,
    status: "BLOCKED",
    detail:
      "Confirm identical LiveKit + Cloudinary secrets in Preview and Production dashboards (Vercel/host)",
  });

  // STEP 2 — Database
  gates.push(fileGate("database/migrations/080_live_studio.sql", "db.migration_080_on_disk", 2));
  gates.push(fileGate("database/migrations/081_live_recordings.sql", "db.migration_081_on_disk", 2));
  gates.push({
    id: "db.migrations_applied",
    step: 2,
    status: process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim() ? "BLOCKED" : "BLOCKED",
    detail:
      "Apply 080 then 081 in Supabase SQL editor; verify tables, indexes, RLS, functions, triggers, realtime",
  });

  // STEP 3 — LiveKit
  const livekitMissing = env.missing.some((k) => k.includes("LIVEKIT"));
  gates.push({
    id: "livekit.room_token_roles",
    step: 3,
    status: livekitMissing ? "BLOCKED" : "BLOCKED",
    detail: livekitMissing
      ? "Set LiveKit secrets, then verify room/token/host/viewer/speaker/cam/mic/share/reconnect/roles"
      : "Env present — manually verify room creation, token, joins, A/V, screen share, reconnect, roles",
  });

  // STEP 4 — Recording lifecycle
  gates.push(fileGate("lib/live/egress.ts", "recording.egress_module", 4));
  gates.push(fileGate("app/api/live/egress/webhook/route.ts", "recording.webhook", 4));
  gates.push({
    id: "recording.lifecycle",
    step: 4,
    status: "BLOCKED",
    detail:
      "Configure LiveKit Egress → Cloudinary/S3 → webhook → live_recordings → Community Replay end-to-end",
  });

  // STEP 5 — Health + logs
  gates.push(fileGate("app/api/live/health/route.ts", "health.route", 5));
  gates.push(fileGate("lib/live/observability.ts", "health.observability", 5));
  gates.push(await healthGate(5));

  // STEP 6 — Playwright
  gates.push(fileGate("e2e/live-studio.spec.ts", "e2e.spec_on_disk", 6));
  gates.push(fileGate("playwright.config.ts", "e2e.playwright_config", 6));
  gates.push({
    id: "e2e.suite",
    step: 6,
    status: process.env.LIVE_E2E_STORAGE_STATE?.trim() ? "BLOCKED" : "BLOCKED",
    detail: process.env.LIVE_E2E_STORAGE_STATE?.trim()
      ? "Auth state present — run: npx playwright test e2e/live-studio.spec.ts"
      : "Set LIVE_E2E_STORAGE_STATE (+ running app + LiveKit + migrations), then run full E2E",
  });

  // STEP 7 — Cross-browser
  gates.push({
    id: "browser.matrix",
    step: 7,
    status: "BLOCKED",
    detail: "Validate Chrome/Safari/Firefox/Edge × Desktop/Tablet/Mobile (manual or device farm)",
  });

  // Security (always runnable)
  const viewerOk =
    !canPublishAv("viewer") &&
    !canRecord("viewer") &&
    !canEndLive("viewer") &&
    !canInviteSpeaker("viewer") &&
    !canRemoveSpeaker("viewer") &&
    !canMuteParticipant("viewer") &&
    !canLaunchPoll("viewer");
  gates.push({
    id: "security.viewer_isolation",
    step: 3,
    status: viewerOk ? "PASS" : "FAIL",
    detail: viewerOk
      ? "Viewer cannot publish/record/end/invite/remove/mute/poll"
      : "Role matrix allows viewer privileged action",
  });

  // STEP 8 — Release artifacts (only when all clear)
  const fail = gates.filter((g) => g.status === "FAIL").length;
  const blocked = gates.filter((g) => g.status === "BLOCKED").length;
  const pass = gates.filter((g) => g.status === "PASS").length;
  const ready = fail === 0 && blocked === 0;

  gates.push({
    id: "release.branch_tag_docs",
    step: 8,
    status: ready ? "PASS" : "BLOCKED",
    detail: ready
      ? "Create release/live-studio-v1.0.0 + tag LIVE_STUDIO_v1.0.0 + notes + ops runbook (no push unless instructed)"
      : "Do NOT create branch/tag/docs until every gate is PASS",
  });

  console.log("\n=== LIVE STUDIO RC6 PRODUCTION RELEASE GATES ===\n");
  let lastStep = 0;
  for (const g of gates) {
    if (g.step !== lastStep) {
      console.log(`--- STEP ${g.step} ---`);
      lastStep = g.step;
    }
    console.log(`${g.status.padEnd(7)} ${g.id} — ${g.detail}`);
  }

  console.log(`\nSummary: ${pass} PASS · ${blocked} BLOCKED · ${fail} FAIL`);
  console.log(
    ready
      ? "\nLIVE STUDIO v1.0.0 — Production Ready (create branch/tag/docs locally; do not push unless instructed)"
      : "\nNOT Production Ready — clear BLOCKED gates before release/live-studio-v1.0.0 and LIVE_STUDIO_v1.0.0."
  );
  console.log(
    "\nUnblock checklist:\n" +
      "  1. Add LiveKit + Cloudinary to .env.local, Preview, Production\n" +
      "  2. Apply database/migrations/080_live_studio.sql then 081_live_recordings.sql\n" +
      "  3. Verify LiveKit joins + roles on staging\n" +
      "  4. Verify Egress → webhook → replay\n" +
      "  5. GET /api/live/health → 200 ok\n" +
      "  6. npx playwright test e2e/live-studio.spec.ts\n" +
      "  7. Cross-browser matrix\n" +
      "  8. Re-run this script; only then create branch/tag/docs\n"
  );
  process.exit(fail > 0 ? 1 : 0);
}

main();
