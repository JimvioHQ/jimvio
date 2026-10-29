"use client";

import { useMemo } from "react";
import { ALL_COUNTRY_CODES } from "@/lib/geo/timezone-country";

/** Country picker that stores ISO codes. Older free-text values still show. */
export function CountrySelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const options = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      names = null;
    }
    return ALL_COUNTRY_CODES.map((code) => ({ code, name: names?.of(code) ?? code })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, []);
  const known = options.some((o) => o.code === value.toUpperCase());
  return (
    <select
      className="identity-input"
      value={known ? value.toUpperCase() : value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select your country</option>
      {!known && value ? <option value={value}>{value}</option> : null}
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
