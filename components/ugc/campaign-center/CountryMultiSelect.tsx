"use client";

import { useMemo, useState } from "react";
import { listIsoCountries } from "@/lib/ugc/campaign-brief";

export function CountryMultiSelect({
  allCountries,
  codes,
  onAllCountries,
  onCodes,
}: {
  allCountries: boolean;
  codes: string[];
  onAllCountries: (value: boolean) => void;
  onCodes: (codes: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const countries = useMemo(() => listIsoCountries(), []);
  const selected = new Set(codes);
  const visible = countries
    .filter((country) => {
      if (selected.has(country.code)) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return country.name.toLowerCase().includes(q) || country.code.toLowerCase().includes(q);
    })
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[13px] font-medium text-[#374151]">
        <input
          type="checkbox"
          checked={allCountries}
          onChange={(event) => onAllCountries(event.target.checked)}
        />
        All countries
      </label>
      {allCountries ? (
        <p className="text-[12px] text-[#6B7280]">Creators in every country can participate.</p>
      ) : (
        <>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search countries"
            aria-label="Search countries"
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15"
          />
          {codes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {codes.map((code) => {
                const name = countries.find((country) => country.code === code)?.name ?? code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onCodes(codes.filter((item) => item !== code))}
                    className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#374151]"
                  >
                    {name} ×
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-[#9A3412]">Select at least one country, or choose all countries.</p>
          )}
          <ul className="max-h-40 overflow-auto rounded-xl border border-[#EEF0F2]">
            {visible.map((country) => (
              <li key={country.code}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-[#FAFAFA]"
                  onClick={() => {
                    onCodes([...codes, country.code]);
                    setQuery("");
                  }}
                >
                  <span>{country.name}</span>
                  <span className="text-[11px] text-[#9CA3AF]">{country.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
