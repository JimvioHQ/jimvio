"use client";

import { useState, useTransition, type ElementType } from "react";
import Link from "next/link";
import {
  Ban,
  PauseCircle,
  Trash2,
  Save,
  Loader2,
  KeyRound,
  LogOut,
  Mail,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Snowflake,
} from "lucide-react";
import {
  BrandBtn,
  Divider,
  Field,
  Grid,
  TextInput,
  Toast,
  Toggle,
  type ToastMsg,
} from "@/components/admin/form-primitive";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/ui/admin";
import { cn } from "@/lib/utils";
import {
  clearManagedUserMfa,
  deleteManagedUser,
  repairManagedUserBrokenMfa,
  revokeManagedUserSessions,
  sendManagedUserPasswordReset,
  setUserAccountStatus,
  toggleManagedUserRole,
  updateAdminManagedUser,
  type AccountStatus,
  type AdminUserEditInput,
} from "@/lib/actions/admin-users";
import type { AdminUserDetail } from "@/services/admin/getAdminUsers";

export function AdminUserModerationPanel({ user }: { user: AdminUserDetail }) {
  const isAdminAccount = user.roles.some((r) => r.role === "admin" && r.is_active);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [reason, setReason] = useState(user.moderation_reason ?? "");
  const [editOpen, setEditOpen] = useState(false);

  const [form, setForm] = useState<AdminUserEditInput>({
    full_name: user.full_name ?? "",
    username: user.username ?? "",
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    website: user.website ?? "",
    city: user.city ?? "",
    country: user.country ?? "",
    is_verified: user.is_verified,
  });

  const accountStatus = user.account_status ?? (user.is_active ? "active" : "suspended");
  const isDeleted = accountStatus === "deleted";
  const mfaStatus = user.two_factor_status ?? (user.two_factor_enabled ? "enabled" : "disabled");
  const mfaBroken = mfaStatus === "broken";
  const mfaEnabled = mfaStatus === "enabled";

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setToast({ msg: result.error ?? "Action failed", type: "err" });
        return;
      }
      setToast({ msg: "Changes saved", type: "ok" });
    });
  }

  function moderate(status: AccountStatus) {
    if (status !== "active" && !reason.trim()) {
      setToast({ msg: "Enter a moderation reason first", type: "err" });
      return;
    }
    run(() => setUserAccountStatus(user.id, status, reason));
  }

  function removeAccess() {
    if (!reason.trim()) {
      setToast({ msg: "Enter a moderation reason first", type: "err" });
      return;
    }
    if (
      !confirm(
        `Permanently delete ${user.backup_email ?? user.email}? They will lose access immediately, be hidden across the platform, and only remain visible under Deleted (backup) in admin.`,
      )
    ) {
      return;
    }
    run(() => deleteManagedUser(user.id, reason));
  }

  return (
    <>
      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              Account security
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              status={accountStatus}
              size="md"
            />
            {user.pending_reports > 0 && (
              <Link
                href="/admin/verifications?tab=reports"
                className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-600/20 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400"
              >
                {user.pending_reports} pending report{user.pending_reports !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-5 p-4">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-3 py-2.5 text-[12px] text-[var(--color-text-muted)]">
            <p className="font-semibold text-[var(--color-text-primary)]">Two-factor authentication</p>
            <p className="mt-1">
              Status:{" "}
              <span className="font-medium text-[var(--color-text-primary)]">
                {mfaStatus === "enabled" && "Enabled"}
                {mfaStatus === "disabled" && "Disabled"}
                {mfaStatus === "broken" && "Broken enrollment (profile flag without secret)"}
                {mfaStatus === "pending_setup" && "Setup in progress"}
              </span>
            </p>
            {mfaBroken ? (
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                User cannot complete login until broken 2FA is repaired.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <ModerationBtn
              icon={Mail}
              label="Send password reset"
              disabled={pending || isDeleted}
              onClick={() => {
                if (!confirm(`Send a password reset email to ${user.email}?`)) return;
                run(() => sendManagedUserPasswordReset(user.id));
              }}
            />
            <ModerationBtn
              icon={LogOut}
              label="Revoke sessions"
              disabled={pending || isDeleted}
              onClick={() => {
                if (!reason.trim()) {
                  setToast({ msg: "Enter a moderation reason first", type: "err" });
                  return;
                }
                if (!confirm(`Sign out ${user.email} from all devices?`)) return;
                run(() => revokeManagedUserSessions(user.id, reason));
              }}
            />
            {mfaBroken ? (
              <ModerationBtn
                icon={ShieldOff}
                label="Repair broken 2FA"
                tone="success"
                disabled={pending}
                onClick={() => {
                  if (!reason.trim()) {
                    setToast({ msg: "Enter a reason first", type: "err" });
                    return;
                  }
                  run(() => repairManagedUserBrokenMfa(user.id, reason));
                }}
              />
            ) : null}
            {mfaEnabled ? (
              <ModerationBtn
                icon={KeyRound}
                label="Clear 2FA"
                tone="danger"
                disabled={pending}
                onClick={() => {
                  if (!reason.trim()) {
                    setToast({ msg: "Enter a reason first", type: "err" });
                    return;
                  }
                  if (
                    !confirm(
                      `Remove 2FA for ${user.email}? They will need to re-enroll from account settings.`,
                    )
                  ) {
                    return;
                  }
                  run(() => clearManagedUserMfa(user.id, reason));
                }}
              />
            ) : null}
          </div>

          {isAdminAccount ? (
            <p className="text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
              This user is a platform admin. Suspend, ban, and delete actions are disabled. You can still edit profile fields below.
            </p>
          ) : isDeleted ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-3 py-2.5 text-[12px] text-[var(--color-text-muted)]">
                <p className="font-semibold text-[var(--color-text-primary)]">Account deleted</p>
                <p className="mt-1">
                  This user no longer has platform access. Profile data is anonymized everywhere except this admin backup view.
                </p>
                {user.backup_email ? (
                  <p className="mt-2">
                    <span className="font-semibold text-[var(--color-text-primary)]">Backup email: </span>
                    {user.backup_email}
                  </p>
                ) : null}
                {user.backup_full_name ? (
                  <p className="mt-1">
                    <span className="font-semibold text-[var(--color-text-primary)]">Backup name: </span>
                    {user.backup_full_name}
                  </p>
                ) : null}
                {user.deleted_at ? (
                  <p className="mt-1 opacity-70">Deleted {new Date(user.deleted_at).toLocaleString()}</p>
                ) : null}
              </div>
              {user.moderation_reason ? (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-3 py-2.5 text-[12px] text-[var(--color-text-muted)]">
                  <span className="font-semibold text-[var(--color-text-primary)]">Reason: </span>
                  {user.moderation_reason}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {user.moderation_reason && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-3 py-2.5 text-[12px] text-[var(--color-text-muted)]">
                  <span className="font-semibold text-[var(--color-text-primary)]">Last action: </span>
                  {user.moderation_reason}
                  {user.moderated_at ? (
                    <span className="ml-1 opacity-70">
                      · {new Date(user.moderated_at).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              )}

              <Field label="Moderation reason" hint="Required for suspend, freeze, ban, or delete">
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Repeated UGC policy violations per report #…"
                  className="min-h-[72px] text-[13px]"
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                {accountStatus !== "active" && (
                  <ModerationBtn
                    icon={ShieldCheck}
                    label="Reactivate"
                    tone="success"
                    disabled={pending}
                    onClick={() => moderate("active")}
                  />
                )}
                {accountStatus !== "suspended" && (
                  <ModerationBtn
                    icon={PauseCircle}
                    label="Suspend"
                    disabled={pending}
                    onClick={() => moderate("suspended")}
                  />
                )}
                {accountStatus !== "frozen" && (
                  <ModerationBtn
                    icon={Snowflake}
                    label="Freeze"
                    disabled={pending}
                    onClick={() => moderate("frozen")}
                  />
                )}
                {accountStatus !== "banned" && (
                  <ModerationBtn
                    icon={Ban}
                    label="Ban"
                    tone="danger"
                    disabled={pending}
                    onClick={() => moderate("banned")}
                  />
                )}
                <ModerationBtn
                  icon={Trash2}
                  label="Delete account"
                  tone="danger"
                  disabled={pending}
                  onClick={removeAccess}
                />
              </div>
            </>
          )}

          <Divider label="Edit profile" />

          <button
            type="button"
            onClick={() => setEditOpen((v) => !v)}
            className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
          >
            {editOpen ? "Hide editor" : "Edit user details"}
          </button>

          {editOpen && (
            <div className="space-y-4">
              <Grid cols={2}>
                <Field label="Full name" required>
                  <TextInput
                    value={form.full_name}
                    onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
                  />
                </Field>
                <Field label="Username">
                  <TextInput
                    value={form.username}
                    onChange={(v) => setForm((f) => ({ ...f, username: v.toLowerCase() }))}
                  />
                </Field>
                <Field label="Phone">
                  <TextInput value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
                </Field>
                <Field label="Country">
                  <TextInput value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} />
                </Field>
                <Field label="City">
                  <TextInput value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
                </Field>
                <Field label="Website">
                  <TextInput value={form.website} onChange={(v) => setForm((f) => ({ ...f, website: v }))} />
                </Field>
              </Grid>
              <Field label="Bio">
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  className="min-h-[80px] text-[13px]"
                />
              </Field>
              <Toggle
                checked={form.is_verified}
                onChange={(v) => setForm((f) => ({ ...f, is_verified: v }))}
                label="Verified email"
                description="Mark profile as verified in the platform"
              />

              <div className="flex justify-end">
                <BrandBtn
                  icon={pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  disabled={pending}
                  onClick={() => run(() => updateAdminManagedUser(user.id, form))}
                >
                  Save profile
                </BrandBtn>
              </div>
            </div>
          )}

          {user.roles.filter((r) => r.role !== "admin" && r.role !== "buyer").length > 0 && (
            <>
              <Divider label="Roles" />
              <div className="space-y-3">
                {user.roles
                  .filter((r) => r.role !== "buyer" && r.role !== "admin")
                  .map((r) => (
                    <Toggle
                      key={r.role}
                      checked={r.is_active}
                      onChange={(active) =>
                        run(() => toggleManagedUserRole(user.id, r.role, active))
                      }
                      label={r.role.replace(/_/g, " ")}
                      description={r.is_active ? "Role is active" : "Role is disabled"}
                      danger={!r.is_active}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ModerationBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger" | "success";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition-colors disabled:opacity-50",
        tone === "danger" && "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400",
        tone === "success" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400",
        tone === "default" && "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
