"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download,
  LayoutGrid,
  List,
  Megaphone,
  Search,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasCapability } from "@/lib/community/workspace/permissions";
import {
  MEMBER_ASSIGNABLE_ROLES,
  MEMBER_FILTER_STATUSES,
  MEMBER_ROLE_LABELS,
  MEMBER_SORT_OPTIONS,
} from "@/lib/community/owner-console/members";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";
import { MembersOverview } from "./MembersOverview";
import { MembersList } from "./MembersList";
import { MemberProfilePanel } from "./MemberProfilePanel";
import { InviteMembersWizard } from "./InviteMembersWizard";
import { JoinRequestsPanel } from "./JoinRequestsPanel";
import { MembersAnalyticsPanel } from "./MembersAnalyticsPanel";
import { useOwnerMembers } from "./useOwnerMembers";

export function MembersManagement() {
  const { community, role } = useOwnerConsole();
  const searchParams = useSearchParams();
  const canView = hasCapability(role, "members.view");
  const canInvite = hasCapability(role, "members.invite");
  const canManage = hasCapability(role, "members.manage");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const {
    members,
    overview,
    invites,
    joinRequests,
    analytics,
    selectedMember,
    setSelectedMember,
    loading,
    error,
    search,
    setSearch,
    filter,
    setFilter,
    roleFilter,
    setRoleFilter,
    sort,
    setSort,
    view,
    setView,
    selectedIds,
    toggleSelect,
    clearSelection,
    panelTab,
    setPanelTab,
    load,
    runAction,
    bulkAction,
    openMember,
    createInvite,
    reviewJoinRequests,
  } = useOwnerMembers(community?.id ?? null);

  useEffect(() => {
    if (searchParams.get("action") === "invite" && canInvite) {
      setInviteOpen(true);
    }
  }, [searchParams, canInvite]);

  if (!community) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Select a community to manage members.
      </p>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Members management requires staff access
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Your current role ({role}) does not include members.view.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-5">
      <MembersOverview overview={overview} />

      <div className="flex flex-wrap gap-1.5 rounded-xl bg-[var(--color-surface-secondary)] p-1 ring-1 ring-[var(--color-border)]">
        {(
          [
            ["members", "Members"],
            ["requests", "Join Requests"],
            ["invites", "Invitations"],
            ["analytics", "Analytics"],
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
            {id === "requests" && overview.pending > 0
              ? ` (${overview.pending})`
              : ""}
          </button>
        ))}
      </div>

      {panelTab === "members" && (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, username, or email…"
                className="h-10 pl-9"
                aria-label="Search members"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                Advanced Filters
              </Button>
              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as (typeof MEMBER_SORT_OPTIONS)[number])
                }
                className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                aria-label="Sort members"
              >
                <option value="joined_desc">Newest joined</option>
                <option value="joined_asc">Oldest joined</option>
                <option value="name">Name</option>
                <option value="last_active">Last active</option>
                <option value="contribution">Contribution</option>
                <option value="creator_score">Creator score</option>
                <option value="role">Role</option>
              </select>
              <div className="inline-flex rounded-md border border-[var(--color-border)] p-0.5">
                <button
                  type="button"
                  aria-label="Table view"
                  aria-pressed={view === "table"}
                  onClick={() => setView("table")}
                  className={`rounded px-2 py-1.5 ${
                    view === "table"
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Card view"
                  aria-pressed={view === "cards"}
                  onClick={() => setView("cards")}
                  className={`rounded px-2 py-1.5 ${
                    view === "cards"
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
              {canInvite && (
                <Button type="button" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Invite Members
                </Button>
              )}
              {canManage && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void bulkAction("export")}
                  disabled={selectedIds.length === 0}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
          </div>

          {advancedOpen && (
            <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(
                    e.target.value as (typeof MEMBER_FILTER_STATUSES)[number]
                  )
                }
                className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
                aria-label="Filter by status"
              >
                {MEMBER_FILTER_STATUSES.map((f) => (
                  <option key={f} value={f}>
                    {f === "all" ? "All statuses" : f}
                  </option>
                ))}
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
                aria-label="Filter by role"
              >
                <option value="all">All roles</option>
                <option value="owner">Owner</option>
                {MEMBER_ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {MEMBER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-3 py-2">
              <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                {selectedIds.length} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void bulkAction("assign_role", { role: "moderator" })
                }
              >
                Assign Role
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void bulkAction("mute")}
              >
                Mute
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void bulkAction("ban")}
              >
                Ban
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void bulkAction("announce", {
                    message: "Community announcement from Owner Console",
                  })
                }
              >
                <Megaphone className="mr-1 h-3.5 w-3.5" />
                Announce
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}

          {error && (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <div className="rounded-2xl border border-[var(--color-border)] px-6 py-16 text-center text-sm text-[var(--color-text-muted)]">
              Loading members…
            </div>
          ) : (
            <MembersList
              members={members}
              view={view}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onOpen={(id) => void openMember(id)}
              onAction={(id, action) => {
                if (action === "change_role") {
                  void openMember(id);
                  return;
                }
                void runAction(id, action);
              }}
            />
          )}
        </>
      )}

      {panelTab === "requests" && (
        <JoinRequestsPanel
          requests={joinRequests}
          onReview={(ids, action) => void reviewJoinRequests(ids, action)}
        />
      )}

      {panelTab === "invites" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            {canInvite && (
              <Button type="button" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                New invite
              </Button>
            )}
          </div>
          {invites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-muted)]">
              No invitations yet. Create a share link or email invite.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]"
                >
                  <div>
                    <p className="font-semibold">
                      {inv.email || inv.code} · {inv.role}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {inv.status} · uses {inv.usesCount}
                      {inv.maxUses != null ? `/${inv.maxUses}` : ""}
                      {inv.expiresAt
                        ? ` · expires ${new Date(inv.expiresAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void navigator.clipboard.writeText(inv.shareUrl)
                    }
                  >
                    Copy link
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {panelTab === "analytics" && (
        <MembersAnalyticsPanel analytics={analytics} />
      )}

      {selectedMember && (
        <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md">
          <MemberProfilePanel
            member={selectedMember}
            communitySlug={community.slug}
            onClose={() => setSelectedMember(null)}
            onAction={(id, action, extra) => {
              void runAction(id, action, extra).then(() => {
                if (action !== "remove") void openMember(id);
                else setSelectedMember(null);
              });
            }}
          />
        </div>
      )}

      <InviteMembersWizard
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onCreate={createInvite}
        invites={invites}
      />

      <button
        type="button"
        className="sr-only"
        onClick={() => void load()}
        aria-hidden
      >
        Refresh
      </button>
    </div>
  );
}
