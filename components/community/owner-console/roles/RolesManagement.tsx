"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasCapability } from "@/lib/community/workspace/permissions";
import type { RoleTemplateKey } from "@/lib/community/owner-console/roles";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";
import { CreateRoleDialog, RoleTemplatesPanel } from "./CreateRoleDialog";
import { RoleEditor } from "./RoleEditor";
import {
  RolesAnalyticsPanel,
  RolesAuditPanel,
} from "./RolesAnalyticsPanel";
import { RolesList } from "./RolesList";
import { useOwnerRoles } from "./useOwnerRoles";

export function RolesManagement() {
  const { community, role } = useOwnerConsole();
  const canView =
    hasCapability(role, "roles.view") || hasCapability(role, "settings.manage");
  const canManage = hasCapability(role, "roles.manage");
  const canAssign = hasCapability(role, "members.role");
  const [createOpen, setCreateOpen] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  const {
    filteredRoles,
    templates,
    selectedRole,
    roleMembers,
    analytics,
    audit,
    loading,
    error,
    search,
    setSearch,
    panelTab,
    setPanelTab,
    editorTab,
    setEditorTab,
    includeArchived,
    setIncludeArchived,
    openRole,
    createRole,
    updateRole,
    runAction,
    deleteRole,
    assignMembers,
    exportRoles,
    importRoles,
    loadAudit,
  } = useOwnerRoles(community?.id ?? null);

  useEffect(() => {
    if (!community?.id) return;
    void (async () => {
      try {
        const [gRes, cRes] = await Promise.all([
          fetch(
            `/api/c/owner/groups?communityId=${encodeURIComponent(community.id)}&limit=100`
          ),
          fetch(
            `/api/c/owner/channels?communityId=${encodeURIComponent(community.id)}&limit=100`
          ),
        ]);
        if (gRes.ok) {
          const g = await gRes.json();
          setGroups(
            (g.groups ?? []).map((x: { id: string; name: string }) => ({
              id: x.id,
              name: x.name,
            }))
          );
        }
        if (cRes.ok) {
          const c = await cRes.json();
          setChannels(
            (c.channels ?? []).map((x: { id: string; name: string }) => ({
              id: x.id,
              name: x.name,
            }))
          );
        }
      } catch {
        // optional scopes
      }
    })();
  }, [community?.id]);

  useEffect(() => {
    if (panelTab === "audit") {
      const t = setTimeout(() => void loadAudit(auditSearch), 250);
      return () => clearTimeout(t);
    }
  }, [auditSearch, panelTab, loadAudit]);

  if (!community) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Select a community to manage roles.
      </p>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Roles management requires staff access
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Your current role ({role}) does not include roles.view.
        </p>
      </div>
    );
  }

  async function createFromTemplate(key: RoleTemplateKey) {
    const created = await createRole({ fromTemplate: key });
    if (created) {
      setPanelTab("roles");
      await openRole(created as Parameters<typeof openRole>[0]);
    }
  }

  return (
    <div className="relative space-y-5">
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-[var(--color-surface-secondary)] p-1 ring-1 ring-[var(--color-border)]">
        {(
          [
            ["roles", "Roles"],
            ["templates", "Role Templates"],
            ["analytics", "Analytics"],
            ["audit", "Audit"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPanelTab(id)}
            className={`h-8 rounded-lg px-3 text-[12px] font-semibold transition-all ${
              panelTab === id
                ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {panelTab === "roles" && (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles, capabilities…"
                className="h-10 pl-9"
                aria-label="Search roles"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                Archived
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void exportRoles()}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
              {canManage && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Import
                  </Button>
                  <input
                    ref={importRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const parsed = JSON.parse(String(reader.result));
                          const list = Array.isArray(parsed)
                            ? parsed
                            : parsed.roles ?? [];
                          void importRoles({
                            roles: list.filter(
                              (r: { isSystem?: boolean }) => !r.isSystem
                            ),
                          });
                        } catch {
                          // toast via importRoles path
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create Role
                  </Button>
                </>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
              Loading roles…
            </p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <RolesList
                roles={filteredRoles}
                selectedId={selectedRole?.id ?? null}
                onSelect={(r) => void openRole(r)}
              />
              {selectedRole ? (
                <RoleEditor
                  key={selectedRole.id}
                  role={selectedRole}
                  members={roleMembers}
                  tab={editorTab}
                  onTabChange={setEditorTab}
                  canManage={canManage}
                  onUpdate={(patch) => updateRole(selectedRole.id, patch)}
                  onDuplicate={() => void runAction(selectedRole.id, "duplicate")}
                  onDelete={() => {
                    if (
                      window.confirm(
                        `Delete role “${selectedRole.name}”? Members keep their base role.`
                      )
                    ) {
                      void deleteRole(selectedRole.id);
                    }
                  }}
                  onAssign={(ids) => {
                    if (!canAssign) return;
                    void assignMembers(selectedRole.id, ids, "assign");
                  }}
                  onRemove={(ids) => {
                    if (!canAssign) return;
                    void assignMembers(selectedRole.id, ids, "remove");
                  }}
                  groups={groups}
                  channels={channels}
                />
              ) : (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-16 text-center">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Select a role
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                      Edit permissions, scopes, members, and analytics.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {panelTab === "templates" && (
        <RoleTemplatesPanel
          templates={templates}
          onUse={(key) => {
            if (!canManage) return;
            void createFromTemplate(key);
          }}
        />
      )}

      {panelTab === "analytics" && (
        <RolesAnalyticsPanel analytics={analytics} />
      )}

      {panelTab === "audit" && (
        <RolesAuditPanel
          entries={audit}
          search={auditSearch}
          onSearch={setAuditSearch}
        />
      )}

      <CreateRoleDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createRole}
        templates={templates}
      />
    </div>
  );
}
