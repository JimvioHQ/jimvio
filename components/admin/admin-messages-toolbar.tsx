"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { adminBtnGhost, adminBtnPrimary, adminInputClass } from "@/lib/admin/ui";

export function AdminMessagesToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    params.delete("page");
    router.push(`/admin/messages?${params.toString()}`);
  }

  function reset() {
    setQ("");
    router.push("/admin/messages");
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex min-w-[220px] flex-col gap-1">
        <span className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          Search
        </span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="Buyer, vendor, or message…"
            className={`${adminInputClass} w-full pl-8`}
          />
        </div>
      </div>
      <button type="button" onClick={apply} className={adminBtnPrimary}>
        Search
      </button>
      {searchParams.get("q") && (
        <button type="button" onClick={reset} className={adminBtnGhost}>
          Reset
        </button>
      )}
    </div>
  );
}
