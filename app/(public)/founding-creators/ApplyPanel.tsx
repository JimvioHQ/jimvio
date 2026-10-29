"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Crown, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CONTRIBUTIONS, MAX_LINKS, NOTE_MAX, NOTE_MIN, type ContributionId } from "@/lib/founding/program";

export type ApplicationState = {
  status: "pending" | "approved" | "declined";
  decision_note: string | null;
  reviewed_at: string | null;
  contributions: string[];
} | null;

const btn =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300";

/** Hero call to action: what the visitor can do right now. */
export function HeroAction({
  signedIn,
  seat,
  application,
  full,
}: {
  signedIn: boolean;
  seat: number | null;
  application: ApplicationState;
  full: boolean;
}) {
  if (seat) {
    return (
      <span className={`${btn} bg-white/10 text-amber-200 ring-1 ring-amber-300/40`}>
        <Crown className="h-4 w-4" /> You hold seat #{String(seat).padStart(3, "0")}
      </span>
    );
  }
  if (full) return <span className={`${btn} bg-white/10 text-white/70`}>All seats have been given</span>;
  if (!signedIn) {
    return (
      <Link href="/login?next=/founding-creators%23apply" className={`${btn} bg-[#fd5000] text-white hover:bg-[#e04800]`}>
        <Crown className="h-4 w-4" /> Sign in to apply
      </Link>
    );
  }
  if (application?.status === "pending") {
    return (
      <a href="#apply" className={`${btn} bg-white/10 text-white ring-1 ring-white/20`}>
        <Clock3 className="h-4 w-4" /> Application under review
      </a>
    );
  }
  return (
    <a href="#apply" className={`${btn} bg-[#fd5000] text-white hover:bg-[#e04800]`}>
      <Crown className="h-4 w-4" /> Apply for a seat
    </a>
  );
}

export function ApplyPanel({
  signedIn,
  seat,
  application,
  full,
}: {
  signedIn: boolean;
  seat: number | null;
  application: ApplicationState;
  full: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<ContributionId[]>(
    (application?.contributions ?? []).filter((c): c is ContributionId => CONTRIBUTIONS.some((x) => x.id === c)),
  );
  const [note, setNote] = useState("");
  const [links, setLinks] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const card = "rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8";

  if (seat) {
    return (
      <div className={card}>
        <p className="flex items-center gap-2 text-[17px] font-bold text-[var(--color-text-primary)]">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> You&apos;re Founding Creator #{String(seat).padStart(3, "0")}
        </p>
        <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">Your badge and founding fee are active.</p>
      </div>
    );
  }
  if (full) {
    return (
      <div className={card}>
        <p className="text-[17px] font-bold text-[var(--color-text-primary)]">All 100 seats have been given</p>
        <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">The Founding Creators program is closed.</p>
      </div>
    );
  }
  if (!signedIn) {
    return (
      <div className={card}>
        <p className="text-[17px] font-bold text-[var(--color-text-primary)]">Sign in to apply</p>
        <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">Applications are tied to your Jimvio account so we can see your activity.</p>
        <Link href="/login?next=/founding-creators%23apply" className={`${btn} mt-5 bg-[#fd5000] text-white hover:bg-[#e04800]`}>
          Sign in
        </Link>
      </div>
    );
  }
  if (application?.status === "pending" && !editing) {
    return (
      <div className={card}>
        <p className="flex items-center gap-2 text-[17px] font-bold text-[var(--color-text-primary)]">
          <Clock3 className="h-5 w-5 text-amber-600" /> Your application is under review
        </p>
        <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">
          Jimvio is looking at your activity on the platform. You&apos;ll get a notification with the decision.
        </p>
        <button type="button" onClick={() => setEditing(true)} className="mt-4 text-[13px] font-semibold text-[#fd5000] hover:underline">
          Update my application
        </button>
      </div>
    );
  }
  const declinedRecently =
    application?.status === "declined" &&
    application.reviewed_at &&
    Date.now() - new Date(application.reviewed_at).getTime() < 14 * 24 * 3600 * 1000;
  if (declinedRecently) {
    const again = new Date(new Date(application!.reviewed_at!).getTime() + 14 * 24 * 3600 * 1000);
    return (
      <div className={card}>
        <p className="flex items-center gap-2 text-[17px] font-bold text-[var(--color-text-primary)]">
          <XCircle className="h-5 w-5 text-[var(--color-text-muted)]" /> Not approved this time
        </p>
        {application!.decision_note ? (
          <p className="mt-2 rounded-xl bg-[var(--color-surface-secondary)] p-3 text-[14px] text-[var(--color-text-secondary)]">
            {application!.decision_note}
          </p>
        ) : null}
        <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
          You can apply again from {again.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/founding-creators/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributions: picked,
          note,
          links: links.split(/\s+/).filter(Boolean),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Your application could not be sent.");
      toast.success("Application sent — Jimvio will review your activity.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Your application could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={card}>
      <h3 className="text-[19px] font-black tracking-tight text-[var(--color-text-primary)]">Apply for a seat</h3>
      <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">
        Tell us how you help Jimvio grow. We review your real activity before approving.
      </p>

      <fieldset className="mt-6">
        <legend className="text-[13px] font-bold text-[var(--color-text-primary)]">How do you help Jimvio? Pick all that apply.</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CONTRIBUTIONS.map((c) => {
            const on = picked.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                className={cn(
                  "rounded-2xl border p-3 text-left transition",
                  on ? "border-[#fd5000] bg-[#fd5000]/5 ring-1 ring-[#fd5000]/30" : "border-[var(--color-border)] hover:border-[#fd5000]/40",
                )}
              >
                <span className="block text-[13px] font-bold text-[var(--color-text-primary)]">{c.label}</span>
                <span className="mt-0.5 block text-[12px] text-[var(--color-text-muted)]">{c.detail}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="text-[13px] font-bold text-[var(--color-text-primary)]">What have you done, or what will you do?</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={NOTE_MAX}
          required
          minLength={NOTE_MIN}
          placeholder="e.g. I run a trading community of 120 members and post daily lessons. I've invited 15 creators to Jimvio."
          className="mt-2 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg,#fff)] p-3 text-[14px] outline-none focus:ring-2 focus:ring-[#fd5000]/30"
        />
        <span className="mt-1 block text-right text-[11px] text-[var(--color-text-muted)]">
          {note.trim().length}/{NOTE_MAX}
        </span>
      </label>

      <label className="mt-2 block">
        <span className="text-[13px] font-bold text-[var(--color-text-primary)]">Links (optional)</span>
        <span className="block text-[12px] text-[var(--color-text-muted)]">
          Your social pages, videos or anything that shows your work. Up to {MAX_LINKS}, separated by spaces.
        </span>
        <input
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          placeholder="https://tiktok.com/@you https://youtube.com/@you"
          className="mt-2 h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg,#fff)] px-3 text-[14px] outline-none focus:ring-2 focus:ring-[#fd5000]/30"
        />
      </label>

      <button
        type="submit"
        disabled={busy || picked.length === 0 || note.trim().length < NOTE_MIN}
        className={`${btn} mt-6 w-full bg-[#fd5000] text-white hover:bg-[#e04800] disabled:opacity-60 sm:w-auto`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
        Send application
      </button>
    </form>
  );
}
