/**
 * Live Studio RC4 — production readiness gate report.
 * Run: node --experimental-strip-types scripts/verify-live-studio-rc4.ts
 *
 * Does not print secrets. Marks each release criterion PASS / FAIL / BLOCKED.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  canEndLive,
  canPublishAv,
  canRecord,
  canShareScreen,
  canInviteSpeaker,
  canLaunchPoll,
  type LiveStageRole,
} from "../lib/live/roles.ts";

type Gate = { id: string; status: "PASS" | "FAIL" | "BLOCKED" | "SKIP"; detail: string };

function loadEnvLocal(): Record<string, string> {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return {};
  const map: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    map[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return map;
}

function present(v: string | undefined): boolean {
  return Boolean(v && v.trim() && !v.includes("your-project") && !v.includes("xxx"));
}

function securityRoles(): Gate {
  try {
    const viewer: LiveStageRole = "viewer";
    assert.equal(canPublishAv(viewer), false);
    assert.equal(canShareScreen(viewer), false);
    assert.equal(canRecord(viewer), false);
    assert.equal(canEndLive(viewer), false);
    assert.equal(canInviteSpeaker(viewer), false);
    assert.equal(canLaunchPoll(viewer), false);
    assert.equal(canPublishAv("speaker"), true);
    assert.equal(canRecord("host"), true);
    assert.equal(canEndLive("cohost"), false);
    assert.equal(canEndLive("host"), true);
    return { id: "security.role_matrix", status: "PASS", detail: "Viewer cannot publish/record/end" };
  } catch (e) {
    return {
      id: "security.role_matrix",
      status: "FAIL",
      detail: e instanceof Error ? e.message : "role matrix failed",
    };
  }
}

function fileExists(rel: string, id: string): Gate {
  const ok = fs.existsSync(path.join(process.cwd(), rel));
  return {
    id,
    status: ok ? "PASS" : "FAIL",
    detail: ok ? rel : `missing ${rel}`,
  };
}

function main() {
  const env = { ...process.env, ...loadEnvLocal() } as Record<string, string>;
  const gates: Gate[] = [];

  const lkUrl = env.NEXT_PUBLIC_LIVEKIT_URL || env.LIVEKIT_URL;
  const lkKey = env.LIVEKIT_API_KEY;
  const lkSecret = env.LIVEKIT_API_SECRET;
  const lkOk = present(lkUrl) && present(lkKey) && present(lkSecret);
  gates.push({
    id: "livekit.configured",
    status: lkOk ? "PASS" : "BLOCKED",
    detail: lkOk
      ? "NEXT_PUBLIC_LIVEKIT_URL + API key/secret present"
      : "Missing LiveKit env in .env.local (NEXT_PUBLIC_LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)",
  });

  gates.push(fileExists("database/migrations/080_live_studio.sql", "supabase.migration_080"));
  gates.push(fileExists("database/migrations/081_live_recordings.sql", "supabase.migration_081"));
  gates.push({
    id: "supabase.migration_applied",
    status: "BLOCKED",
    detail: "Cannot confirm apply from this environment — run SQL in Supabase SQL editor or `supabase db push`",
  });

  gates.push(fileExists("app/api/live/token/route.ts", "api.live_token"));
  gates.push(fileExists("app/api/live/sessions/[id]/recording/route.ts", "api.egress_recording"));
  gates.push(fileExists("app/api/live/egress/webhook/route.ts", "api.egress_webhook"));
  gates.push(fileExists("lib/live/egress.ts", "lib.egress"));
  gates.push(fileExists("hooks/live/useLiveKitRoom.ts", "hook.livekit_room"));

  gates.push({
    id: "egress.cloudinary_s3",
    status: present(env.LIVEKIT_EGRESS_S3_BUCKET) ? "PASS" : "BLOCKED",
    detail: present(env.LIVEKIT_EGRESS_S3_BUCKET)
      ? "S3 egress bucket configured"
      : "Set LIVEKIT_EGRESS_S3_* or LiveKit Cloud egress storage for durable Egress→Cloudinary",
  });

  gates.push(securityRoles());

  gates.push({
    id: "browser_matrix",
    status: "BLOCKED",
    detail: "Manual / CI browser farm required (Chrome Safari Firefox Edge + mobile)",
  });
  gates.push({
    id: "playwright_e2e",
    status: "BLOCKED",
    detail: "Requires LiveKit + auth storage state + applied migrations",
  });
  gates.push({
    id: "load_test",
    status: "BLOCKED",
    detail: "Requires staged LiveKit project + load harness (100–1000 viewers)",
  });
  gates.push({
    id: "multi_host",
    status: "BLOCKED",
    detail: "Requires configured LiveKit + multi-client session",
  });

  console.log("\n=== LIVE STUDIO RC4 GATE REPORT ===\n");
  let pass = 0;
  let blocked = 0;
  let fail = 0;
  for (const g of gates) {
    console.log(`${g.status.padEnd(7)} ${g.id} — ${g.detail}`);
    if (g.status === "PASS") pass++;
    else if (g.status === "FAIL") fail++;
    else blocked++;
  }

  const releaseReady = fail === 0 && blocked === 0;
  console.log(`\nSummary: ${pass} PASS · ${blocked} BLOCKED · ${fail} FAIL`);
  console.log(
    releaseReady
      ? "\nLIVE STUDIO v1.0.0 — Ready for Production"
      : "\nNOT Ready for Production — do not tag v1.0.0 until BLOCKED/FAIL gates clear."
  );
  process.exit(fail > 0 ? 1 : 0);
}

main();
