"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

const commands = [
  ["Operations", "/admin/operations"], ["Command Center", "/admin/command-center"],
  ["Trust & Safety", "/admin/trust-safety"], ["Growth", "/admin/growth"],
  ["Growth engine", "/admin/growth/engine"],
  ["Feedback", "/admin/feedback"], ["Growth KPIs", "/admin/growth-kpis"],
  ["System analysis", "/admin/system-analysis"], ["Users", "/admin/users"], ["Orders", "/admin/orders"],
] as const;

export function AdminCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen((value) => !value); }
      if (event.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("admin-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("admin-command-palette", onOpen);
    };
  }, []);
  if (!open) return null;
  const results = commands.filter(([name]) => name.toLowerCase().includes(query.toLowerCase()));
  return <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-[15vh]" role="dialog" aria-modal="true" aria-label="Admin command palette" onMouseDown={() => setOpen(false)}>
    <div className="w-full max-w-lg rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3"><Search className="h-4 w-4 text-[var(--color-text-muted)]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none" placeholder="Jump to admin page…" /><button type="button" onClick={() => setOpen(false)} aria-label="Close command palette"><X className="h-4 w-4 text-[var(--color-text-muted)]" /></button></div>
      <div className="p-2">{results.map(([name, href]) => <button type="button" key={href} onClick={() => { router.push(href); setOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]">{name}</button>)}</div>
    </div>
  </div>;
}
