"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, CircleDashed } from "lucide-react";
import {
  CREATOR_PROFILE_REQUIRED_FIELDS,
  type CreatorProfileCompletion,
} from "@/lib/identity/creator-profile-completion";

/**
 * The creator part of the one Jimvio profile: what is done, what is left,
 * and a jump to each missing field.
 */
export function CreatorProfileChecklist({
  completion,
  saved,
}: {
  completion: CreatorProfileCompletion;
  saved?: boolean;
}) {
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("next");
    if (raw && raw.startsWith("/ugc/") && !raw.startsWith("//")) setNext(raw.slice(0, 200));
  }, []);
  const total = CREATOR_PROFILE_REQUIRED_FIELDS.length;
  const missingIds = new Set(completion.missing.map((m) => m.id));
  const done = total - missingIds.size;
  const pct = Math.round((done / total) * 100);

  return (
    <div
      className={
        completion.complete
          ? "rounded-2xl border border-[#C8E6C9] bg-[#F3FBF3] px-4 py-3"
          : "rounded-2xl border border-[#FFDCC7] bg-[#FFF6F1] px-4 py-3"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className={completion.complete ? "text-[13px] font-semibold text-[#1B7A3A]" : "text-[13px] font-semibold text-[#D6480F]"}>
          {completion.complete
            ? saved
              ? "Creator profile complete and saved"
              : "Creator profile complete — save to apply"
            : `Creator profile: ${done} of ${total} done`}
        </p>
        <span className="text-[12px] font-bold tabular-nums text-[#161512]">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className={completion.complete ? "h-full rounded-full bg-[#1B7A3A]" : "h-full rounded-full bg-[#FF5A1F]"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {CREATOR_PROFILE_REQUIRED_FIELDS.map((field) => {
          const miss = completion.missing.find((m) => m.id === field.id);
          return (
            <li key={field.id}>
              <a
                href={`#field-${field.id}`}
                className="flex items-start gap-2 rounded-lg px-1.5 py-1 text-[12.5px] hover:bg-black/[0.03]"
              >
                {miss ? (
                  <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D6480F]" aria-hidden="true" />
                ) : (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1B7A3A]" aria-hidden="true" />
                )}
                <span>
                  <span className={miss ? "font-semibold text-[#161512]" : "text-[#59544B] line-through decoration-black/20"}>
                    {field.label}
                  </span>
                  {miss?.hint ? <span className="block text-[11.5px] text-[#8B8579]">{miss.hint}</span> : null}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      {completion.complete && saved ? (
        <Link
          href={next ?? "/ugc"}
          className="mt-3 inline-flex h-9 items-center rounded-full bg-[#FF5A1F] px-4 text-[12.5px] font-bold text-white hover:opacity-90"
        >
          {next ? "Back to the campaign" : "Find campaigns to join"}
        </Link>
      ) : null}
    </div>
  );
}
