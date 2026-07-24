"use client";

import { useState } from "react";
import { Check, Copy, Link2, Mail, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_INVITE_EXPIRY_DAYS,
  MEMBER_ASSIGNABLE_ROLES,
  MEMBER_ROLE_LABELS,
  type OwnerMemberInvite,
} from "@/lib/community/owner-console/members";

export function InviteMembersWizard({
  open,
  onOpenChange,
  onCreate,
  invites,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    email?: string;
    role?: string;
    maxUses?: number | null;
    expiresInDays?: number;
    note?: string;
  }) => Promise<OwnerMemberInvite | null>;
  invites: OwnerMemberInvite[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [maxUses, setMaxUses] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(
    String(DEFAULT_INVITE_EXPIRY_DAYS)
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastInvite, setLastInvite] = useState<OwnerMemberInvite | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    try {
      const invite = await onCreate({
        email: email.trim() || undefined,
        role,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresInDays: Number(expiresInDays) || DEFAULT_INVITE_EXPIRY_DAYS,
        note: note.trim() || undefined,
      });
      if (invite) {
        setLastInvite(invite);
        setEmail("");
        setNote("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        aria-label="Invite members"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Invite Members
            </h2>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Email invites, share links, QR codes, expiration and usage limits.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>

        <div className="space-y-3">
          <label className="block text-[12px] font-semibold">
            Email (optional)
            <Input
              className="mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              type="email"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[12px] font-semibold">
              Role
              <select
                className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="member">Member</option>
                {MEMBER_ASSIGNABLE_ROLES.filter((r) => r !== "member").map(
                  (r) => (
                    <option key={r} value={r}>
                      {MEMBER_ROLE_LABELS[r]}
                    </option>
                  )
                )}
              </select>
            </label>
            <label className="block text-[12px] font-semibold">
              Max uses
              <Input
                className="mt-1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                inputMode="numeric"
              />
            </label>
          </div>
          <label className="block text-[12px] font-semibold">
            Expires in (days)
            <Input
              className="mt-1"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="block text-[12px] font-semibold">
            Note
            <Input
              className="mt-1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional context"
            />
          </label>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            <Mail className="mr-1.5 h-4 w-4" />
            Create invite
          </Button>
        </div>

        {lastInvite && (
          <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Share link
            </p>
            <p className="mt-2 break-all text-[12px] text-[var(--color-text-primary)]">
              {lastInvite.shareUrl}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void copyLink(lastInvite.shareUrl)}
              >
                {copied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                Copy link
              </Button>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(lastInvite.shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 text-[12px] font-semibold"
              >
                <QrCode className="h-3.5 w-3.5" />
                QR code
              </a>
            </div>
            <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
              Code {lastInvite.code} · status {lastInvite.status}
              {lastInvite.expiresAt
                ? ` · expires ${new Date(lastInvite.expiresAt).toLocaleDateString()}`
                : ""}
            </p>
          </div>
        )}

        {invites.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Recent invites
            </p>
            <ul className="space-y-2">
              {invites.slice(0, 6).map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[12px]"
                >
                  <span className="min-w-0 truncate">
                    <Link2 className="mr-1 inline h-3.5 w-3.5" />
                    {inv.email || inv.code} · {inv.status}
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-[var(--color-accent)]"
                    onClick={() => void copyLink(inv.shareUrl)}
                  >
                    Copy
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
