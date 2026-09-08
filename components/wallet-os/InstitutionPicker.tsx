"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import {
  CUSTOM_INSTITUTION_ID,
  type PayoutInstitution,
} from "@/lib/payments/payout-provider-catalog";
import { ProviderLogo } from "@/components/wallet-os/ProviderLogo";
import { cn } from "@/lib/utils";

type InstitutionPickerProps = {
  id: string;
  label: string;
  institutions: PayoutInstitution[];
  value: string;
  onChange: (id: string) => void;
  searchPlaceholder?: string;
};

/**
 * Accessible searchable institution selector with logos + Custom/Other.
 */
export function InstitutionPicker({
  id,
  label,
  institutions,
  value,
  onChange,
  searchPlaceholder = "Search…",
}: InstitutionPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.shortCode || "").toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q),
    );
  }, [institutions, query]);

  const selected = institutions.find((i) => i.id === value) ?? null;

  return (
    <div className="relative">
      <label htmlFor={`${id}-search`} className="mb-1.5 block text-[12px] font-medium text-[#726D64]">
        {label}
      </label>

      {selected && !open ? (
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl border border-[#FF5A1F]/45 bg-[#FFF6F1] px-3 py-2.5 text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35",
          )}
        >
          <ProviderLogo institution={selected} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[#121113]">
              {selected.name}
            </span>
            {selected.shortCode && selected.id !== CUSTOM_INSTITUTION_ID ? (
              <span className="block text-[11px] text-[#9B968D]">{selected.shortCode}</span>
            ) : null}
          </span>
          <span className="text-[11px] font-semibold text-[#D6480F]">Selected</span>
        </button>
      ) : (
        <div className="rounded-xl border border-black/[0.08] bg-white focus-within:border-[#FF5A1F]/50 focus-within:ring-2 focus-within:ring-[#FF5A1F]/20">
          <div className="flex items-center gap-2 border-b border-black/[0.06] px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#9B968D]" aria-hidden />
            <input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="h-10 w-full bg-transparent text-[13px] text-[#121113] outline-none placeholder:text-[#B9B3A6]"
            />
          </div>
          <ul
            role="listbox"
            aria-labelledby={id}
            className="max-h-52 overflow-y-auto overscroll-contain py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-[12px] text-[#9B968D]">No matches — try Custom / Other</li>
            ) : (
              filtered.map((inst) => {
                const active = value === inst.id;
                return (
                  <li key={inst.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(inst.id);
                        setQuery("");
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                        active ? "bg-[#FFF6F1]" : "hover:bg-[#F8FAFC]",
                      )}
                    >
                      <ProviderLogo institution={inst} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[#121113]">
                          {inst.name}
                        </span>
                        {inst.shortCode && inst.id !== CUSTOM_INSTITUTION_ID ? (
                          <span className="block text-[10.5px] text-[#9B968D]">{inst.shortCode}</span>
                        ) : null}
                      </span>
                      {active ? <Check className="h-3.5 w-3.5 shrink-0 text-[#D6480F]" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
