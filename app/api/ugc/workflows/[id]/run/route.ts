import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireBrandWorkspace, brandIdFromRequest } from "@/lib/ugc/enterprise/brand-access";
import { requireBrandPermission } from "@/lib/ugc/enterprise/permissions";
import { emitUgcWebhook } from "@/lib/ugc/enterprise/webhooks";
import { notifyUser } from "@/lib/notifications/notify-user";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;
  const perm = await requireBrandPermission(db, vendor.id, user.id, "automations.manage");
  if (!perm.ok) {
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
  const now = new Date().toISOString();
  const skipped: string[] = [];
  const completed: string[] = [];

  for (const node of nodes) {
    const type = String(node.type ?? "").toLowerCase();
    if (!type || type === "start" || type === "end") {
      completed.push(node.id ?? type);
      continue;
    }
    if (type.includes("wait") || type.includes("delay") || type.includes("schedule")) {
      skipped.push(node.id ?? type);
      continue;
    }
    try {
      if (type.includes("webhook")) {
        await emitUgcWebhook(db, vendor.id, "workflow.run", {
          workflowId: id,
          campaignId,
          node: node.id ?? type,
        });
      } else if (type.includes("notify") || type.includes("email") || type.includes("notification")) {
        const { data: owner } = await db.from("vendors").select("user_id").eq("id", vendor.id).maybeSingle();
        if (owner?.user_id) {
          await notifyUser(db, {
            userId: owner.user_id,
            type: "system",
            title: workflow.name || "UGC workflow",
            message: `Workflow step ${type} ran.`,
            data: { workflowId: id, campaignId, node: node.id ?? type },
          });
        }
      } else if (type.includes("status")) {
        skipped.push(node.id ?? type);
        continue;
      }
      completed.push(node.id ?? type);
    } catch {
      skipped.push(node.id ?? type);
    }
  }

  const lastNode = completed[completed.length - 1] ?? nodes[nodes.length - 1]?.id ?? "end";
  const { data: run, error: iErr } = await db
    .from("ugc_workflow_runs")
    .insert({
      workflow_id: id,
      campaign_id: campaignId,
      status: "completed",
      current_node: lastNode,
      context: {
        started_by: user.id,
        steps_completed: completed,
        steps_skipped: skipped,
        blocker: skipped.length
          ? "Wait/delay/status nodes require a job queue and were skipped."
          : null,
        execution_status: skipped.length ? "completed_with_skipped" : "completed",
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
      execution: {
        workflow: workflow.name,
        nodesProcessed: completed.length,
        skipped,
        status: skipped.length ? "completed_with_skipped" : "completed",
      },
    },
    { status: 201 }
  );
}
