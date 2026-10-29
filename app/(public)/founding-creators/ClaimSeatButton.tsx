"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ClaimSeatButton({
  signedIn,
  seat,
  eligible,
  full,
}: {
  signedIn: boolean;
  seat: number | null;
  eligible: boolean;
  full: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const base =
    "inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300";

  if (seat) {
    return (
      <span className={`${base} bg-white/10 text-amber-200 ring-1 ring-amber-300/40`}>
        <Crown className="h-4 w-4" /> You hold seat #{String(seat).padStart(3, "0")}
      </span>
    );
  }
  if (full) {
    return <span className={`${base} bg-white/10 text-white/70`}>All seats claimed</span>;
  }
  if (!signedIn) {
    return (
      <Link href="/login?next=/founding-creators" className={`${base} bg-[#fd5000] text-white hover:bg-[#e04800]`}>
        <Crown className="h-4 w-4" /> Sign in to claim a seat
      </Link>
    );
  }
  if (!eligible) {
    return (
      <a href="#how" className={`${base} bg-white text-[#0F1115] hover:bg-white/90`}>
        See how to qualify
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      className={`${base} bg-[#fd5000] text-white hover:bg-[#e04800] disabled:opacity-70`}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/founding-creators/claim", { method: "POST" });
          const json = (await res.json()) as { error?: string; label?: string };
          if (!res.ok) throw new Error(json.error ?? "The seat could not be claimed.");
          toast.success(`Welcome, ${json.label}!`);
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "The seat could not be claimed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
      Claim my seat
    </button>
  );
}
