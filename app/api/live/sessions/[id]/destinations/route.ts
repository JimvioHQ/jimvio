import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  prepareLiveDestinations,
  startDestinationEgress,
  stopAllDestinations,
  reconnectDestination,
} from "@/lib/live/destinations/destination-manager";
import { listDestinationSessions } from "@/lib/live/destinations/repository";
import { getSession } from "@/services/live/session-service";
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
  if (session.host_id !== user.id) {
    return NextResponse.json({ error: "Only the host can view destination status" }, { status: 403 });
  }

  const destinations = await listDestinationSessions(sessionId);
  return NextResponse.json({ destinations });
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

    // Fire-and-forget-safe: prepare + egress without blocking Jimvio session creation
    const { prepared, failures } = await prepareLiveDestinations({
      userId: user.id,
      liveSessionId: sessionId,
      destinationIds: ids,
      metadata,
    });

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
      failures: failures.length,
      egressId: egress.egressId,
    });

    const destinations = await listDestinationSessions(sessionId);
    return NextResponse.json({
      destinations,
      failures,
      egress,
      note:
        failures.length > 0
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
