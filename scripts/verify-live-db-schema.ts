/**
 * Post-repair Live Studio schema probe against production PostgREST/OpenAPI.
 * Does not apply DDL (requires Supabase SQL editor or DATABASE_URL).
 *
 * Run: node --experimental-strip-types scripts/verify-live-db-schema.ts
 */

import fs from "node:fs";
import path from "node:path";

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

type Gate = { id: string; status: "PASS" | "FAIL" | "BLOCKED"; detail: string };

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or service role key");
    process.exit(1);
  }

  const gates: Gate[] = [];
  const oa = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" },
  });
  const spec = (await oa.json()) as {
    definitions?: Record<string, { properties?: Record<string, unknown>; required?: string[] }>;
  };
  const defs = spec.definitions ?? {};

  const needTables = [
    "communities",
    "community_memberships",
    "rooms",
    "spaces",
    "community_messages",
    "live_sessions",
    "live_session_participants",
    "live_polls",
    "live_poll_votes",
    "live_recordings",
  ];
  for (const t of needTables) {
    gates.push({
      id: `table.${t}`,
      status: defs[t] ? "PASS" : "FAIL",
      detail: defs[t] ? "present in OpenAPI" : "missing — apply 082/083 then reload schema cache",
    });
  }

  gates.push({
    id: "table.live_participants_absent",
    status: defs.live_participants ? "FAIL" : "PASS",
    detail: defs.live_participants
      ? "duplicate live_participants exists — should use live_session_participants only"
      : "no duplicate live_participants table",
  });

  const lsCols = Object.keys(defs.live_sessions?.properties ?? {});
  gates.push({
    id: "col.live_sessions.room_id",
    status: lsCols.includes("room_id") ? "PASS" : "FAIL",
    detail: lsCols.includes("room_id")
      ? "room_id present"
      : "room_id missing — apply 082_live_schema_repair.sql",
  });
  gates.push({
    id: "col.live_sessions.space_id",
    status: lsCols.includes("space_id") ? "PASS" : "FAIL",
    detail: lsCols.includes("space_id") ? "space_id preserved" : "space_id missing (unexpected)",
  });

  const partCols = Object.keys(defs.live_session_participants?.properties ?? {});
  for (const col of ["status", "mic_on", "cam_on", "hand_raised", "sharing", "updated_at"]) {
    gates.push({
      id: `col.live_session_participants.${col}`,
      status: partCols.includes(col) ? "PASS" : "FAIL",
      detail: partCols.includes(col) ? "present" : "missing — apply 082",
    });
  }

  const recCols = Object.keys(defs.live_recordings?.properties ?? {});
  for (const col of ["egress_id", "cloudinary_url", "status", "session_id", "started_by"]) {
    gates.push({
      id: `col.live_recordings.${col}`,
      status: recCols.includes(col) ? "PASS" : "FAIL",
      detail: recCols.includes(col) ? "present" : "missing",
    });
  }

  // FK sanity via OpenAPI notes
  const hostFk = String(
    (defs.live_sessions?.properties?.host_id as { description?: string } | undefined)?.description ??
      ""
  );
  gates.push({
    id: "fk.live_sessions.host_id_profiles",
    status: hostFk.includes("profiles.id") ? "PASS" : "BLOCKED",
    detail: hostFk || "no FK description",
  });

  const roomMsg = String(
    (defs.community_messages?.properties?.room_id as { description?: string } | undefined)
      ?.description ?? ""
  );
  gates.push({
    id: "fk.community_messages.room_id_rooms",
    status: roomMsg.includes("rooms.id") ? "PASS" : "BLOCKED",
    detail: roomMsg || "no FK description",
  });

  const files = [
    "database/migrations/080_live_studio.sql",
    "database/migrations/081_live_recordings.sql",
    "database/migrations/082_live_schema_repair.sql",
    "database/migrations/083_live_recordings_repair.sql",
  ];
  for (const f of files) {
    const ok = fs.existsSync(path.join(process.cwd(), f));
    gates.push({ id: `file.${path.basename(f)}`, status: ok ? "PASS" : "FAIL", detail: f });
  }

  const deprecated080 = fs.readFileSync(
    path.join(process.cwd(), "database/migrations/080_live_studio.sql"),
    "utf8"
  );
  const activeCreate = deprecated080
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  gates.push({
    id: "safety.080_no_create_live_sessions",
    status: /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.live_sessions/i.test(activeCreate)
      ? "FAIL"
      : "PASS",
    detail: "080 must not recreate live_sessions",
  });

  console.log("\n=== LIVE STUDIO DB SCHEMA VERIFICATION ===\n");
  let pass = 0,
    fail = 0,
    blocked = 0;
  for (const g of gates) {
    console.log(`${g.status.padEnd(7)} ${g.id} — ${g.detail}`);
    if (g.status === "PASS") pass++;
    else if (g.status === "FAIL") fail++;
    else blocked++;
  }
  console.log(`\nSummary: ${pass} PASS · ${blocked} BLOCKED · ${fail} FAIL`);
  if (fail > 0) {
    console.log(
      "\nApply in Supabase SQL editor (in order):\n  082_live_schema_repair.sql\n  083_live_recordings_repair.sql\nThen: NOTIFY pgrst, 'reload schema'; (or wait for cache refresh) and re-run."
    );
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
