import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";
import { roleCan } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });
  if (!roleCan("owner", "automations.manage") && !roleCan("manager", "automations.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: workflow } = await db
    .from("ugc_workflows")
    .select("id, brand_id, graph, is_enabled, name")
    .eq("id", id)
    .eq("brand_id", vendor.id)
    .maybeSingle();
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  if (!workflow.is_enabled) {
    return NextResponse.json({ error: "Workflow is disabled" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const campaignId = body.campaign_id ?? null;
  const graph = (workflow.graph ?? { nodes: [], edges: [] }) as {
    nodes?: Array<{ id?: string; type?: string }>;
    edges?: unknown[];
  };
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const firstNode = nodes[0]?.id ?? "start";
  const lastNode = nodes[nodes.length - 1]?.id ?? "end";
  const now = new Date().toISOString();

  // Simulate step completion for now — mark run completed immediately.
  const { data: run, error: iErr } = await db
    .from("ugc_workflow_runs")
    .insert({
      workflow_id: id,
      campaign_id: campaignId,
      status: "completed",
      current_node: lastNode,
      context: {
        started_by: user.id,
        simulated: true,
        steps_completed: nodes.map((n) => n.id ?? "step"),
        first_node: firstNode,
        input: body.context && typeof body.context === "object" ? body.context : {},
      },
      started_at: now,
      finished_at: now,
    })
    .select()
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  return NextResponse.json(
    {
      run,
      simulation: {
        workflow: workflow.name,
        nodesProcessed: nodes.length || 1,
        status: "completed",
      },
    },
    { status: 201 }
  );
}
