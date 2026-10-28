import { NextRequest, NextResponse } from "next/server";
import { parseAiActionBody } from "@/lib/ai/actions";
import { agentExecutionIdForUser, runAgentPlan } from "@/lib/ai/agent/execute";
import { AGENT_RECORD_ERROR, loadAgentSession, saveAgentPreference } from "@/lib/ai/agent/server";
import { createOwnedCommunity } from "@/lib/community/create-owned-community";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

const TASK_MAX = 2000;

export async function GET() {
  const session = await loadAgentSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  return NextResponse.json({
    preference: session.preference,
    history: session.history,
    historyAvailable: session.historyAvailable,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // The original community confirm payload stays on its existing service.
  // A client-supplied tool list is never read.
  if ("operation" in body) {
    return legacyCreateCommunity(body);
  }

  const session = await loadAgentSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  if ("preference" in body && !("task" in body) && !("executionId" in body)) {
    const saved = await saveAgentPreference(body.preference);
    if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });
    return NextResponse.json({ ok: true, preference: saved.preference });
  }

  const limit = rateLimit(`ai-agent:${session.ports.userId}`, 12, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many Jimvio AI actions. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const requestedId = typeof body.executionId === "string" ? body.executionId : undefined;
  const executionId = agentExecutionIdForUser(requestedId, session.ports.userId);
  if (requestedId && !executionId) {
    return NextResponse.json(
      { handled: true, status: "refused", content: "That action belongs to a different account.", links: [], steps: [] },
      { status: 200 },
    );
  }

  try {
    const result = await runAgentPlan({
      message: typeof body.task === "string" ? body.task.slice(0, TASK_MAX) : undefined,
      confirm: body.confirm === true,
      cancel: body.cancel === true,
      executionId: executionId ?? undefined,
      ports: session.ports,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: message === AGENT_RECORD_ERROR ? message : AGENT_RECORD_ERROR },
      { status: 500 },
    );
  }
}

async function legacyCreateCommunity(body: unknown) {
  const parsed = parseAiActionBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const result = await createOwnedCommunity({
    name: parsed.name,
    description: parsed.description,
    visibility: "public",
    is_private: false,
    is_free: true,
    currency: "USD",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { id, slug, name } = result.community;
  if (!id || !slug) {
    return NextResponse.json({ error: "Could not create community." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    operation: "create_community",
    community: { id, slug, name },
    href: `/communities/${slug}`,
    manageHref: `/owner/communities/${slug}`,
  });
}
