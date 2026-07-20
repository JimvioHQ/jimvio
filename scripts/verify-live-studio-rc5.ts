/**
 * Live Studio RC5 — production deployment gate report.
 * Run: node --experimental-strip-types scripts/verify-live-studio-rc5.ts
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

type Gate = { id: string; status: "PASS" | "FAIL" | "BLOCKED"; detail: string };

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

function fileGate(rel: string, id: string): Gate {
  const ok = fs.existsSync(path.join(process.cwd(), rel));
  return { id, status: ok ? "PASS" : "FAIL", detail: ok ? rel : `missing ${rel}` };
}

function main() {
  loadEnvLocal();
  const gates: Gate[] = [];
  const env = getLiveStudioEnvReport();

  gates.push({
    id: "env.live_studio",
    status: env.ok ? "PASS" : "BLOCKED",
    detail: env.ok
      ? `All required vars present (${env.present.length})`
      : `Missing: ${env.missing.join(", ")}`,
  });

  gates.push(fileGate("database/migrations/080_live_studio.sql", "db.migration_080"));
  gates.push(fileGate("database/migrations/081_live_recordings.sql", "db.migration_081"));
  gates.push({
    id: "db.migrations_applied",
    status: "BLOCKED",
    detail:
      "No DATABASE_URL in this environment — apply 080+081 in Supabase SQL editor, then re-check via health",
  });

  gates.push(fileGate("app/api/live/health/route.ts", "ops.health"));
  gates.push(fileGate("app/api/live/token/route.ts", "ops.token"));
  gates.push(fileGate("app/api/live/sessions/[id]/recording/route.ts", "ops.recording"));
  gates.push(fileGate("app/api/live/egress/webhook/route.ts", "ops.webhook"));
  gates.push(fileGate("lib/live/observability.ts", "ops.observability"));
  gates.push(fileGate("instrumentation.ts", "ops.boot_env_gate"));

  // Security: viewer cannot privileged actions
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
    status: viewerOk ? "PASS" : "FAIL",
    detail: viewerOk
      ? "Viewer cannot publish/record/end/invite/remove/mute/poll"
      : "Role matrix allows viewer privileged action",
  });

  gates.push({
    id: "livekit.runtime",
    status: env.missing.some((k) => k.includes("LIVEKIT")) ? "BLOCKED" : "PASS",
    detail: env.missing.some((k) => k.includes("LIVEKIT"))
      ? "Configure LiveKit keys then verify join/publish/subscribe manually or via Playwright"
      : "LiveKit env present — run multi-host + Playwright against staging",
  });

  gates.push({
    id: "egress.storage",
    status: process.env.LIVEKIT_EGRESS_S3_BUCKET?.trim() ? "PASS" : "BLOCKED",
    detail: process.env.LIVEKIT_EGRESS_S3_BUCKET?.trim()
      ? "S3 egress configured"
      : "Configure LIVEKIT_EGRESS_S3_* or LiveKit Cloud egress storage + webhook",
  });

  gates.push({
    id: "playwright",
    status: "BLOCKED",
    detail: "Requires LIVE_E2E_STORAGE_STATE + LiveKit + applied migrations + running app",
  });
  gates.push({
    id: "browser_matrix",
    status: "BLOCKED",
    detail: "Manual/CI device farm required",
  });

  console.log("\n=== LIVE STUDIO RC5 DEPLOYMENT GATES ===\n");
  let pass = 0;
  let blocked = 0;
  let fail = 0;
  for (const g of gates) {
    console.log(`${g.status.padEnd(7)} ${g.id} — ${g.detail}`);
    if (g.status === "PASS") pass++;
    else if (g.status === "FAIL") fail++;
    else blocked++;
  }
  const ready = fail === 0 && blocked === 0;
  console.log(`\nSummary: ${pass} PASS · ${blocked} BLOCKED · ${fail} FAIL`);
  console.log(
    ready
      ? "\nLIVE STUDIO v1.0.0 — Production Ready"
      : "\nNOT Production Ready — clear BLOCKED infrastructure gates before tagging v1.0.0."
  );
  console.log(
    "\nTips:\n" +
      "  • GET /api/live/health\n" +
      "  • Set LIVE_STUDIO_REQUIRE_INFRA=true to fail boot when env incomplete\n" +
      "  • Apply database/migrations/080_live_studio.sql then 081_live_recordings.sql\n"
  );
  process.exit(fail > 0 ? 1 : 0);
}

main();
