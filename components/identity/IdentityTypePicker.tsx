"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { IDENTITY_TYPES } from "@/lib/identity/identity-types";
import { cleanCategories } from "@/lib/identity/creator-categories";

/**
 * Primary professional identity for Jimvio Identity 2.1.
 * Replaces the old "What you create" content-category picker on Profile Settings.
 * Existing free-text values remain editable until the user selects a new type.
 */
export function IdentityTypePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const current = value[0] ?? "";
  const isKnown = IDENTITY_TYPES.includes(current as (typeof IDENTITY_TYPES)[number]);
  const [editing, setEditing] = useState(!current);

  if (!editing && current) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#161512] px-3 py-1.5 text-[13px] font-semibold text-white">
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> {current}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-[12px] font-semibold text-[#59544B] hover:border-black/20"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" /> Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[12.5px] text-[#6B7280]">
        Choose the identity that best represents who you are and what you do on Jimvio.
      </p>
      <div className="flex flex-wrap gap-2">
        {IDENTITY_TYPES.map((type) => {
          const selected = current === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                onChange(cleanCategories([type]));
                setEditing(false);
              }}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                selected
                  ? "border-[#FF5A1F] bg-[#FFF1EA] text-[#D6480F]"
                  : "border-[#E5E7EB] bg-white text-[#374151] hover:border-[#D1D5DB]"
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>
      {current && !isKnown ? (
        <p className="text-[12px] text-[#9CA3AF]">
          Current custom value: <span className="font-medium text-[#374151]">{current}</span>. Pick a
          type above to update it, or keep it as-is.
        </p>
      ) : null}
      {current ? (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-[12px] font-semibold text-[#6B7280] hover:text-[#111827]"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
