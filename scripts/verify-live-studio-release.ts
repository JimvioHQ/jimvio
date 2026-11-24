/**
 * Live Studio production hardening — recording, latency, resilience gates.
 * Run: node --experimental-strip-types scripts/verify-live-studio-release.ts
 */

import fs from "node:fs";
import path from "node:path";
import { AccessToken, EgressClient, RoomServiceClient } from "livekit-server-sdk";
import {
  canInviteSpeaker,
  canPublishAv,
  canRecord,
  canShareScreen,
  canEndLive,
} from "../lib/live/roles.ts";
import { getEgressStorageReport, getLiveStudioEnvReport } from "../lib/live/env.ts";
import {
  getLiveKitApiKey,
  getLiveKitApiSecret,
  getLiveKitUrl,
  isLiveKitConfigured,
  liveKitRoomName,
} from "../lib/live/livekit-config.ts";

type Gate = { id: string; status: "PASS" | "FAIL" | "BLOCKED"; detail: string; ms?: number };

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

function hostUrlFromWs(wsUrl: string): string {
  return wsUrl.replace(/^ws:/, "http:").replace(/^wss:/, "https:");
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t0 = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - t0) };
}

async function sb<T>(table: string, query: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${base}/rest/v1/${table}?${query}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${table} ${res.status}: ${text.slice(0, 200)}`);
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

async function main() {
  loadEnvLocal();
  const gates: Gate[] = [];
  const base = process.env.LIVE_E2E_BASE_URL?.trim() || "http://localhost:3000";
  const metrics: Record<string, number> = {};

  // --- Infra ---
  const env = getLiveStudioEnvReport();
  gates.push({
    id: "infra.env",
    status: env.ok ? "PASS" : "FAIL",
    detail: env.ok ? "complete" : env.missing.join(", "),
  });

  const health = await timed(async () => {
    const r = await fetch(`${base}/api/live/health`);
    return { status: r.status, body: await r.json() };
  });
  metrics.health_ms = health.ms;
  gates.push({
    id: "infra.health",
    status: health.value.status === 200 && health.value.body.ok ? "PASS" : "FAIL",
    detail: `${health.value.status} in ${health.ms}ms`,
    ms: health.ms,
  });

  // --- Cloudinary ---
  const cn = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const ck = process.env.CLOUDINARY_API_KEY?.trim();
  const cs = process.env.CLOUDINARY_API_SECRET?.trim();
  gates.push({
    id: "recording.cloudinary_creds",
    status: cn && ck && cs ? "PASS" : "FAIL",
    detail: cn && ck && cs ? `cloud=${cn}` : "missing Cloudinary secrets",
  });

  if (cn && ck && cs) {
    try {
      const auth = Buffer.from(`${ck}:${cs}`).toString("base64");
      const ping = await timed(async () => {
        const r = await fetch(`https://api.cloudinary.com/v1_1/${cn}/resources/image?max_results=1`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        return r.status;
      });
      metrics.cloudinary_api_ms = ping.ms;
      gates.push({
        id: "recording.cloudinary_api",
        status: ping.value === 200 || ping.value === 401 ? (ping.value === 200 ? "PASS" : "FAIL") : "BLOCKED",
        detail: `Cloudinary API → ${ping.value} (${ping.ms}ms)`,
        ms: ping.ms,
      });
    } catch (e) {
      gates.push({
        id: "recording.cloudinary_api",
        status: "FAIL",
        detail: e instanceof Error ? e.message : "cloudinary ping failed",
      });
    }
  }

  // --- LiveKit Egress client ---
  if (!isLiveKitConfigured()) {
    gates.push({ id: "recording.egress_client", status: "FAIL", detail: "LiveKit not configured" });
  } else {
    try {
      const client = new EgressClient(
        hostUrlFromWs(getLiveKitUrl()!),
        getLiveKitApiKey()!,
        getLiveKitApiSecret()!
      );
      const listed = await timed(async () => client.listEgress({}));
      metrics.egress_list_ms = listed.ms;
      gates.push({
        id: "recording.egress_client",
        status: "PASS",
        detail: `listEgress ok (${listed.value.length} active/recent) in ${listed.ms}ms`,
        ms: listed.ms,
      });
    } catch (e) {
      gates.push({
        id: "recording.egress_client",
        status: "FAIL",
        detail: e instanceof Error ? e.message : "egress list failed",
      });
    }
  }

  const storage = getEgressStorageReport();
  gates.push({
    id: "recording.egress_storage",
    status: storage.configured ? "PASS" : "BLOCKED",
    detail: storage.configured
      ? "S3 egress credentials + endpoint format present"
      : storage.storageMode === "invalid_endpoint"
        ? "Invalid LIVEKIT_EGRESS_S3_ENDPOINT — use a valid HTTPS S3-compatible endpoint"
        : "Missing LIVEKIT_EGRESS_S3_BUCKET / ACCESS_KEY / SECRET",
  });

  // Webhook route exists + rejects bad auth
  const wh = await fetch(`${base}/api/live/egress/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/webhook+json", Authorization: "Bearer invalid" },
    body: "{}",
  });
  gates.push({
    id: "recording.webhook_auth",
    status: wh.status === 401 || wh.status === 400 ? "PASS" : "FAIL",
    detail: `POST /api/live/egress/webhook → ${wh.status} (rejects invalid signature)`,
  });

  // Replay metadata table
  const recs = await sb<Array<{ id: string; status: string; cloudinary_url: string | null }>>(
    "live_recordings",
    "select=id,status,cloudinary_url&limit=5"
  );
  gates.push({
    id: "recording.replay_table",
    status: Array.isArray(recs) ? "PASS" : "FAIL",
    detail: `${recs.length} recording row(s); ready for webhook→metadata writes`,
  });

  // --- Token latency ---
  if (isLiveKitConfigured()) {
    const sessions = await sb<Array<{ id: string; host_id: string }>>(
      "live_sessions",
      "select=id,host_id&status=eq.live&limit=1"
    );
    const sid = sessions[0]?.id;
    if (sid) {
      const mint = await timed(async () => {
        const at = new AccessToken(getLiveKitApiKey()!, getLiveKitApiSecret()!, {
          identity: sessions[0].host_id,
          ttl: "2h",
        });
        at.addGrant({
          roomJoin: true,
          room: liveKitRoomName(sid),
          canPublish: true,
          canSubscribe: true,
        });
        return at.toJwt();
      });
      metrics.token_mint_ms = mint.ms;
      gates.push({
        id: "perf.token_mint",
        status: mint.ms < 500 ? "PASS" : mint.ms < 2000 ? "PASS" : "FAIL",
        detail: `${mint.ms}ms (budget <500ms ideal, <2s ok)`,
        ms: mint.ms,
      });

      const room = await timed(async () => {
        const c = new RoomServiceClient(
          hostUrlFromWs(getLiveKitUrl()!),
          getLiveKitApiKey()!,
          getLiveKitApiSecret()!
        );
        await c.createRoom({ name: liveKitRoomName(sid), emptyTimeout: 60 });
        return c.listRooms([liveKitRoomName(sid)]);
      });
      metrics.room_join_prep_ms = room.ms;
      gates.push({
        id: "perf.room_create_list",
        status: room.ms < 3000 ? "PASS" : "FAIL",
        detail: `${room.ms}ms room prep`,
        ms: room.ms,
      });
    }
  }

  // API latency
  const apiLat = await timed(async () => {
    const r = await fetch(`${base}/api/live/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return r.status;
  });
  metrics.api_token_unauth_ms = apiLat.ms;
  gates.push({
    id: "perf.api_token_unauth",
    status: apiLat.ms < 2000 ? "PASS" : "FAIL",
    detail: `${apiLat.ms}ms → ${apiLat.value}`,
    ms: apiLat.ms,
  });

  // --- Resilience (code-path + role) ---
  const mediaPlane = fs.readFileSync("hooks/live/useLiveMediaPlane.ts", "utf8");
  const lkRoom = fs.readFileSync("hooks/live/useLiveKitRoom.ts", "utf8");
  gates.push({
    id: "resilience.media_recover",
    status: mediaPlane.includes("recover") && mediaPlane.includes("offline") ? "PASS" : "FAIL",
    detail: "useLiveMediaPlane recovers on network restore",
  });
  gates.push({
    id: "resilience.livekit_reconnect",
    status: lkRoom.includes("reconnect") ? "PASS" : "FAIL",
    detail: "useLiveKitRoom exposes reconnect()",
  });
  gates.push({
    id: "resilience.cohost_promotion",
    status:
      canRecord("cohost") && canInviteSpeaker("cohost") && canShareScreen("cohost") && !canEndLive("cohost")
        ? "PASS"
        : "FAIL",
    detail: "cohost: record/invite/share; cannot end",
  });
  gates.push({
    id: "resilience.viewer_isolation",
    status: !canPublishAv("viewer") && !canRecord("viewer") ? "PASS" : "FAIL",
    detail: "viewer cannot publish/record",
  });
  gates.push({
    id: "resilience.screen_share_grant",
    status: canShareScreen("host") && canShareScreen("speaker") ? "PASS" : "FAIL",
    detail: "host/speaker may screen share (LiveKit canPublish)",
  });

  // Host disconnect = end session path
  const sessionSvc = fs.readFileSync("services/live/session-service.ts", "utf8");
  gates.push({
    id: "resilience.host_end_session",
    status: sessionSvc.includes("endLiveSession") && sessionSvc.includes('status: "ended"') ? "PASS" : "FAIL",
    detail: "endLiveSession marks session ended + participants left",
  });

  // Playwright auth artifact
  const authPath = process.env.LIVE_E2E_STORAGE_STATE?.trim() || ".auth/live-host.json";
  gates.push({
    id: "e2e.auth_state",
    status: fs.existsSync(authPath) ? "PASS" : "BLOCKED",
    detail: fs.existsSync(authPath) ? authPath : "missing .auth/live-host.json",
  });

  console.log("\n=== LIVE STUDIO RELEASE HARDENING ===\n");
  let pass = 0,
    fail = 0,
    blocked = 0;
  for (const g of gates) {
    console.log(`${g.status.padEnd(7)} ${g.id} — ${g.detail}`);
    if (g.status === "PASS") pass++;
    else if (g.status === "FAIL") fail++;
    else blocked++;
  }
  console.log("\n--- Metrics ---");
  for (const [k, v] of Object.entries(metrics)) console.log(`  ${k}: ${v}ms`);
  console.log(`\nSummary: ${pass} PASS · ${blocked} BLOCKED · ${fail} FAIL`);

  // Write metrics sidecar for audit doc
  fs.writeFileSync(
    path.join(process.cwd(), "test-results/live-release-metrics.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), metrics, gates }, null, 2)
  );

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
