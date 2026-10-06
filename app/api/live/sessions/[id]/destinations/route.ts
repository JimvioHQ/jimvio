import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  prepareLiveDestinations,
  startDestinationEgress,
  stopAllDestinations,
  reconnectDestination,
} from "@/lib/live/destinations/destination-manager";
import {
  getDestinationForUser,
  listDestinationSessions,
} from "@/lib/live/destinations/repository";
import { platformReadiness } from "@/lib/live/destinations/capabilities";
import { canViewLiveSession, getSession } from "@/services/live/session-service";
import { liveStudioLog } from "@/lib/live/observability";
import type { LiveMetadata } from "@/lib/live/destinations/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const isHost = session.host_id === user.id;
  if (!isHost) {
    const allowed = await canViewLiveSession(user.id, session);
    if (!allowed) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
  }

  const destinations = await listDestinationSessions(sessionId);

  // Participants receive public LIVE status only — never credentials / secrets.
  if (!isHost) {
    return NextResponse.json({
      readOnly: true,
      destinations: destinations.map((d) => ({
        id: d.id,
        liveSessionId: d.liveSessionId,
        destinationId: d.destinationId,
        platform: d.platform,
        displayName: d.displayName,
        status: d.status,
        health: d.health,
        lastError: null,
        reconnectCount: 0,
        startedAt: d.startedAt,
        endedAt: d.endedAt,
      })),
    });
  }

  return NextResponse.json({ destinations, readOnly: false });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.host_id !== user.id) {
    return NextResponse.json({ error: "Only the host can manage destinations" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    destinationIds?: string[];
    destinationSessionId?: string;
    description?: string;
    privacy?: "public" | "unlisted" | "private";
  };

  const metadata: LiveMetadata = {
    title: session.title || "Jimvio Live",
    description: body.description,
    privacy: body.privacy ?? (session.privacy === "public" ? "public" : "private"),
  };

  if (body.action === "start") {
    if (session.status !== "live") {
      return NextResponse.json({ error: "Session is not live" }, { status: 400 });
    }
    const ids = Array.isArray(body.destinationIds) ? body.destinationIds : [];
    if (ids.length === 0) {
      return NextResponse.json({ destinations: [], failures: [] });
    }

    // Drop destinations that are approval-gated for LIVE (e.g. TikTok Login Kit ≠ LIVE).
    const allowedIds: string[] = [];
    const blocked: Array<{ destinationId: string; error: string }> = [];
    for (const destinationId of ids) {
      const row = await getDestinationForUser(destinationId, user.id);
      if (!row) {
        blocked.push({ destinationId, error: "Destination not found" });
        continue;
      }
      const readiness = platformReadiness(row.platform);
      if (readiness.status === "requires_approval") {
        if (row.platform === "tiktok") {
          liveStudioLog("info", "tiktok_live_capability_blocked", {
            live_session_id: sessionId,
            destination_id: destinationId,
            user_id: user.id,
          });
        }
        blocked.push({
          destinationId,
          error:
            readiness.message ??
            "This destination requires platform approval for Live streaming.",
        });
        continue;
      }
      allowedIds.push(destinationId);
    }

    // Fire-and-forget-safe: prepare + egress without blocking Jimvio session creation
    const { prepared, failures } = await prepareLiveDestinations({
      userId: user.id,
      liveSessionId: sessionId,
      destinationIds: allowedIds,
      metadata,
    });
    const allFailures = [...blocked, ...failures];

    // Start egress asynchronously so slow providers don't block the response long —
    // but we still await a bounded start for correctness.
    const egress = await startDestinationEgress({
      userId: user.id,
      liveSessionId: sessionId,
      prepared,
      metadata,
    });

    liveStudioLog("info", "destination_start", {
      sessionId,
      userId: user.id,
      prepared: prepared.length,
      failures: allFailures.length,
      egressId: egress.egressId,
    });

    const destinations = await listDestinationSessions(sessionId);
    return NextResponse.json({
      destinations,
      failures: allFailures,
      egress,
      note:
        allFailures.length > 0
          ? "Some destinations failed. Jimvio Live is still running."
          : undefined,
    });
  }

  if (body.action === "stop") {
    await stopAllDestinations({
      userId: user.id,
      liveSessionId: sessionId,
      metadata,
    });
    const destinations = await listDestinationSessions(sessionId);
    return NextResponse.json({ destinations });
  }

  if (body.action === "retry") {
    if (!body.destinationSessionId) {
      return NextResponse.json({ error: "destinationSessionId required" }, { status: 400 });
    }
    const db = createServiceRoleClient();
    const { data: row } = await db
      .from("live_destination_sessions")
      .select("*")
      .eq("id", body.destinationSessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row) {
      return NextResponse.json({ error: "Destination session not found" }, { status: 404 });
    }

    // Re-prepare single destination then add to egress
    const { prepared, failures } = await prepareLiveDestinations({
      userId: user.id,
      liveSessionId: sessionId,
      destinationIds: [row.destination_id as string],
      metadata,
    });

    if (prepared.length === 0) {
      return NextResponse.json({
        ok: false,
        error: failures[0]?.error ?? "Retry failed",
      });
    }

    const target = prepared[0];
    const result = await reconnectDestination({
      userId: user.id,
      liveSessionId: sessionId,
      destinationSessionId: target.destinationSessionId,
      pushUrl: target.prepared.pushUrl,
      egressId: (row.egress_id as string) ?? null,
    });

    // If no existing egress, start a new one for this destination only
    if (!result.ok && !row.egress_id) {
      const egress = await startDestinationEgress({
        userId: user.id,
        liveSessionId: sessionId,
        prepared: [target],
        metadata,
      });
      const destinations = await listDestinationSessions(sessionId);
      return NextResponse.json({ ok: egress.started > 0, destinations, egress });
    }

    const destinations = await listDestinationSessions(sessionId);
    return NextResponse.json({ ...result, destinations });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
