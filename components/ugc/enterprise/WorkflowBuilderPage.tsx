"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "@/components/ugc/workspace/UGCPageShell";
import {
  EnterpriseOutlineButton,
  EnterprisePrimaryButton,
  cardClass,
  fieldClass,
} from "./enterprise-ui";
import { useUgcBrandWorkspace } from "@/components/ugc/workspace/UgcBrandWorkspaceProvider";
import { useLocale } from "@/context/LocaleContext";

type NodeType = "trigger" | "action" | "wait";

type WorkflowNode = {
  id: string;
  type: NodeType;
  label: string;
  config?: Record<string, unknown>;
};

type Workflow = {
  id: string;
  name: string;
  description?: string | null;
  graph?: { nodes?: WorkflowNode[]; edges?: unknown[] };
  is_enabled?: boolean;
};

function newNode(type: NodeType): WorkflowNode {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label:
      type === "trigger"
        ? "On submission approved"
        : type === "wait"
          ? "Wait 24 hours"
          : "Notify brand",
    config: type === "wait" ? { hours: 24 } : {},
  };
}

export function WorkflowBuilderPage() {
  const { ugcFetch } = useUgcBrandWorkspace();
  const { t } = useLocale();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("New workflow");
  const [nodes, setNodes] = useState<WorkflowNode[]>([newNode("trigger")]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const graphJson = useMemo(
    () =>
      JSON.stringify(
        {
          nodes,
          edges: nodes.slice(0, -1).map((n, i) => ({
            from: n.id,
            to: nodes[i + 1]?.id,
          })),
        },
        null,
        2,
      ),
    [nodes],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/workflows", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError("Brand account required for workflows.");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to load workflows");
      const list = (json.data ?? json.workflows ?? []) as Workflow[];
      setWorkflows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectWorkflow = (w: Workflow) => {
    setSelectedId(w.id);
    setName(w.name);
    const n = w.graph?.nodes;
    setNodes(Array.isArray(n) && n.length ? n : [newNode("trigger")]);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    setBusy(true);
    try {
      const graph = JSON.parse(graphJson);
      const url = selectedId ? `/api/ugc/workflows/${selectedId}` : "/api/ugc/workflows";
      const method = selectedId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), graph, is_enabled: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast.success("Workflow saved");
      const saved = json.workflow ?? json.data;
      if (saved?.id) setSelectedId(saved.id);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete workflow?")) return;
    setBusy(true);
    try {
      const res = await ugcFetch(`/api/ugc/workflows/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      if (selectedId === id) {
        setSelectedId(null);
        setName("New workflow");
        setNodes([newNode("trigger")]);
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UGCPageShell
      titleKey="workflows"
      subtitleKey="workflowsSubtitle"
      actions={
        <EnterprisePrimaryButton onClick={() => void save()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("saveGraph")}
        </EnterprisePrimaryButton>
      }
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <div className="space-y-4">
          <p
            role="status"
            className="rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-amber-900"
          >
            {t("workflowWaitNote")}
          </p>
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            <EnterpriseOutlineButton
              className="w-full"
              onClick={() => {
                setSelectedId(null);
                setName("New workflow");
                setNodes([newNode("trigger")]);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("newWorkflow")}
            </EnterpriseOutlineButton>
            {workflows.length === 0 ? (
              <UGCPageEmpty title={t("emptyWorkflows")} description={t("emptyWorkflowsHint")} />
            ) : (
              workflows.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => selectWorkflow(w)}
                  className={`${cardClass} w-full text-left ${selectedId === w.id ? "border-[#FF5A1F]" : ""}`}
                >
                  <p className="text-sm font-bold text-[#111827]">{w.name}</p>
                  <p className="mt-1 text-[11px] text-[#6B7280]">
                    {w.graph?.nodes?.length ?? 0} steps
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-[12px] font-semibold text-[#374151]">
              {t("workflowName")}
              <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <div className="flex flex-wrap gap-2">
              {(["trigger", "action", "wait"] as NodeType[]).map((type) => (
                <EnterpriseOutlineButton key={type} onClick={() => setNodes((p) => [...p, newNode(type)])}>
                  <Plus className="h-4 w-4" />
                  Add {type}
                </EnterpriseOutlineButton>
              ))}
            </div>

            <div className="space-y-2">
              {nodes.map((node, idx) => (
                <div key={node.id} className={`${cardClass} grid gap-2 sm:grid-cols-[100px_1fr_auto]`}>
                  <span className="rounded-full bg-[#FFF0E8] px-2 py-1 text-center text-[11px] font-bold uppercase text-[#FF5A1F]">
                    {idx + 1}. {node.type}
                  </span>
                  <div>
                    <input
                      className={fieldClass}
                      value={node.label}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) => (n.id === node.id ? { ...n, label: e.target.value } : n)),
                        )
                      }
                    />
                    {node.type === "wait" ? (
                      <p className="mt-1 text-[11px] font-semibold text-amber-800">
                        {t("workflowSkippedUnsupported")}
                      </p>
                    ) : null}
                  </div>
                  <EnterpriseOutlineButton
                    onClick={() => setNodes((prev) => prev.filter((n) => n.id !== node.id))}
                    disabled={nodes.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </EnterpriseOutlineButton>
                </div>
              ))}
            </div>

            <div className={cardClass}>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#9CA3AF]">Graph JSON</p>
              <pre className="mt-2 max-h-56 overflow-auto rounded-xl bg-[#F8FAFC] p-3 text-[11px] text-[#374151]">
                {graphJson}
              </pre>
            </div>

            {selectedId ? (
              <EnterpriseOutlineButton onClick={() => void remove(selectedId)} disabled={busy}>
                <Trash2 className="h-4 w-4" />
                {t("deleteWorkflow")}
              </EnterpriseOutlineButton>
            ) : null}
          </div>
        </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
