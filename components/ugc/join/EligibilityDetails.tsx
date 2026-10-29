"use client";

import Link from "next/link";
import { ArrowRight, Check, Globe2, ShieldAlert, X } from "lucide-react";
import type { JoinEligibilityResult } from "@/lib/ugc/join-engine";
import type { CreatorProfileCompletion } from "@/lib/identity/creator-profile-completion";

export type EligibilityCountry = {
  verified: string | null;
  declared: string | null;
  confidence: "none" | "low" | "medium" | "high";
  vpnSuspected: boolean;
} | null;

export type EligibilityCountryPolicy = { mode: "all" | "restricted"; codes: string[]; legacyLabels?: string[] } | null;

function countryName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

const FIX: Record<string, { href: string; label: string } | undefined> = {
  profile: { href: "/settings/profile", label: "Complete profile" },
  platform: { href: "/settings/profile#field-social", label: "Add account" },
  min_followers: { href: "/settings/profile#field-social", label: "Update followers" },
  verified: { href: "/identity/verification", label: "Verify identity" },
};

/**
 * Every rule for one campaign: what the creator meets, what is missing,
 * and the one action that fixes each missing item.
 */
export function EligibilityDetails({
  eligibility,
  profileCompletion,
  country,
  countryPolicy,
}: {
  eligibility: JoinEligibilityResult;
  profileCompletion?: CreatorProfileCompletion | null;
  country?: EligibilityCountry;
  countryPolicy?: EligibilityCountryPolicy;
}) {
  const unmet = eligibility.reasons.filter((r) => !r.met);
  const met = eligibility.reasons.filter((r) => r.met);
  const restricted = countryPolicy?.mode === "restricted";

  return (
    <div className="space-y-4">
      {unmet.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-800">
          <Check className="h-4 w-4" aria-hidden="true" /> You meet every requirement for this campaign.
        </p>
      ) : (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wide text-rose-700">Missing ({unmet.length})</p>
          <ul className="mt-2 space-y-2">
            {unmet.map((r) => {
              const fix = FIX[r.id];
              return (
                <li key={r.id} className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#111827]">{r.label}</p>
                      {r.detail ? <p className="text-[12px] text-[#4B5563]">{r.detail}</p> : null}
                      {r.id === "profile" && profileCompletion && !profileCompletion.complete ? (
                        <ul className="mt-1.5 space-y-1">
                          {profileCompletion.missing.map((m) => (
                            <li key={m.id} className="text-[12px] text-[#374151]">
                              <Link href={`/settings/profile#field-${m.id}`} className="font-semibold text-[#FF5A1F] hover:underline">
                                {m.label}
                              </Link>
                              {m.hint ? <span className="text-[#6B7280]"> — {m.hint}</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    {fix ? (
                      <Link
                        href={fix.href}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FF5A1F] px-3 py-1.5 text-[11.5px] font-bold text-white hover:opacity-90"
                      >
                        {fix.label} <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {met.length > 0 ? (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wide text-emerald-700">Met ({met.length})</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {met.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-[12.5px] text-[#374151]">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>
                  {r.label}
                  {r.detail ? <span className="text-[#9CA3AF]"> · {r.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {country ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
            <Globe2 className="h-4 w-4 text-[#6B7280]" aria-hidden="true" /> Your country
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <dt className="text-[#6B7280]">Confirmed by Jimvio</dt>
              <dd className="font-semibold text-[#111827]">
                {country.verified ? countryName(country.verified) : "Not confirmed yet"}
              </dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">On your profile</dt>
              <dd className="font-semibold text-[#111827]">{country.declared ? countryName(country.declared) : "Not set"}</dd>
            </div>
          </dl>
          {country.vpnSuspected ? (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-amber-800">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Your connection looks like a VPN or proxy. Turn it off — Jimvio only counts your real location.
            </p>
          ) : !country.verified ? (
            <p className="mt-2 text-[12px] text-[#4B5563]">
              Jimvio confirms your country from where you really connect over a few days, so a VPN cannot change it. Keep
              using Jimvio normally{restricted ? " and come back to this campaign" : ""}.
            </p>
          ) : null}
          {restricted ? (
            <p className="mt-2 text-[12px] text-[#4B5563]">
              This campaign is open in:{" "}
              <span className="font-semibold text-[#111827]">
                {[...(countryPolicy?.codes ?? []).map(countryName), ...(countryPolicy?.legacyLabels ?? [])].join(", ")}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-[12px] text-[#4B5563]">This campaign is open in every country.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
