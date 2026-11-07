"use client";

import Link from "next/link";
import {
  Building2,
  Globe,
  MapPin,
  Plus,
} from "lucide-react";
import type {
  IdentityProfilePayload,
  IdentityResumeEntry,
} from "@/lib/identity/types";
import { IDENTITY_V2_SECTIONS } from "@/lib/identity/v2-sections";
import { formatPublicCountry } from "@/lib/identity/public-location";
import { IdentityCard, IdentityButton, cn } from "@/components/identity/identity-ui";
import { IdentityPortfolio } from "@/components/identity/IdentityPortfolio";
import { IdentityModulePanel, type IdentitySurface } from "@/components/identity/IdentityModulePanel";
import { IdentityAchievements } from "@/components/identity/IdentityAchievements";
import { IdentityBookingForm } from "@/components/identity/IdentityBookingForm";

const AVAILABILITY_LABEL: Record<string, string> = {
  open: "Open to work",
  limited: "Limited availability",
  booked: "Fully booked",
  unavailable: "Not available",
};

function SectionShell({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <IdentityCard className="overflow-hidden border-[#E5E7EB] bg-white shadow-none">
        <div className="flex flex-col gap-3 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold tracking-tight text-[#111827]">{title}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">{description}</p>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </IdentityCard>
    </section>
  );
}

function OwnerAddLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12.5px] font-semibold text-[#111827] transition-colors hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

function ResumeList({ entries }: { entries: IdentityResumeEntry[] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-xl border border-[#E5E7EB] bg-[#FCFCFD] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#111827]">{entry.title}</p>
              {entry.organization ? (
                <p className="mt-0.5 text-[13px] text-[#6B7280]">{entry.organization}</p>
              ) : null}
            </div>
            {(entry.startedOn || entry.endedOn || entry.isCurrent) && (
              <p className="shrink-0 text-[12px] text-[#9CA3AF]">
                {[entry.startedOn, entry.endedOn ?? (entry.isCurrent ? "Present" : null)]
                  .filter(Boolean)
                  .join(" – ")}
              </p>
            )}
          </div>
          {entry.description ? (
            <p className="mt-2 text-[13px] leading-relaxed text-[#4B5563]">{entry.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-[#F3F4F6] py-2.5 last:border-0 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-[12.5px] font-medium text-[#9CA3AF]">{label}</dt>
      <dd className="text-[13.5px] text-[#111827]">{value}</dd>
    </div>
  );
}

export function IdentityV2Sections({ payload }: { payload: IdentityProfilePayload }) {
  const { profile, isOwner } = payload;
  const displayName = profile.fullName || profile.username || "Jimvio member";
  const experienceHref = "/settings/profile#identity-managers-experience";
  const educationHref = "/settings/profile#identity-managers-education";
  const servicesHref = "/settings/profile#identity-managers-services";

  const experience = payload.resume.filter((e) => e.entryType === "experience" || e.entryType === "industry");
  const education = payload.resume.filter(
    (e) => e.entryType === "education" || e.entryType === "certification",
  );
  const businessEntries = payload.resume.filter(
    (e) => e.entryType === "brand" || e.entryType === "campaign",
  );
  const countryOnly = formatPublicCountry(profile.country);
  const industries = profile.industries.length
    ? profile.industries.join(", ")
    : profile.specialties.length
      ? profile.specialties.join(", ")
      : null;

  const presence = payload.modulePresence;
  const surfaces: IdentitySurface[] = (
    ["ugc", "affiliate", "marketplace", "community"] as const
  ).filter((s) => (presence ? presence[s] : true));

  const showExperience = experience.length > 0;
  const showEducation = education.length > 0;
  const showSkills = profile.skills.length > 0;
  const showPortfolio = payload.portfolio.length > 0;
  const showBusiness = businessEntries.length > 0 || (presence ? presence.any : surfaces.length > 0);
  const showServices =
    isOwner ||
    payload.canBook ||
    profile.contactPreferences.in_app ||
    profile.contactPreferences.email ||
    profile.contactPreferences.booking;

  const meta = Object.fromEntries(IDENTITY_V2_SECTIONS.map((s) => [s.id, s]));

  return (
    <div className="mt-6 space-y-5">
      <SectionShell
        id="overview"
        title={meta.overview.title}
        description={meta.overview.description}
        action={isOwner ? <OwnerAddLink href="/settings/profile" label="Edit overview" /> : undefined}
      >
        {profile.bio ? (
          <div className="max-w-3xl">
            {profile.shortBioLines?.length ? (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
                Full biography
              </p>
            ) : null}
            <p className="text-[14px] leading-relaxed text-[#374151]">{profile.bio}</p>
          </div>
        ) : isOwner ? (
          <p className="text-[13.5px] text-[#9CA3AF]">
            Add a professional summary in{" "}
            <Link href="/settings/profile" className="font-semibold text-[#FF5A1F] hover:underline">
              Profile Settings
            </Link>
            .
          </p>
        ) : null}

        <dl className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4">
          <MetaRow label="Headline" value={profile.headline} />
          <MetaRow label="Industry" value={industries} />
          <MetaRow
            label="Location"
            value={
              countryOnly ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#9CA3AF]" />
                  {countryOnly}
                </span>
              ) : null
            }
          />
          <MetaRow
            label="Availability"
            value={AVAILABILITY_LABEL[profile.availability] ?? profile.availability}
          />
          <MetaRow
            label="Website"
            value={
              profile.website ? (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-[#FF5A1F] hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null
            }
          />
        </dl>

        {(payload.badges.length > 0 || payload.milestones.length > 0) && (
          <div className="mt-5">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
              Highlights
            </p>
            <IdentityAchievements badges={payload.badges} milestones={payload.milestones} />
          </div>
        )}

        {payload.testimonials.length > 0 ? (
          <div className="mt-5">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
              Recommendations
            </p>
            <div className="space-y-3">
              {payload.testimonials.slice(0, 3).map((item) => (
                <blockquote
                  key={item.id}
                  className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-[13.5px] leading-relaxed text-[#374151]"
                >
                  “{item.quote}”
                  <footer className="mt-2 text-[12px] font-medium text-[#6B7280]">
                    {item.authorName}
                    {item.authorRole || item.authorCompany
                      ? ` · ${[item.authorRole, item.authorCompany].filter(Boolean).join(", ")}`
                      : ""}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        ) : null}
      </SectionShell>

      {showExperience ? (
        <SectionShell
          id="experience"
          title={meta.experience.title}
          description={meta.experience.description}
          action={isOwner ? <OwnerAddLink href={experienceHref} label="Add experience" /> : undefined}
        >
          <ResumeList entries={experience} />
        </SectionShell>
      ) : null}

      {showEducation ? (
        <SectionShell
          id="education"
          title={meta.education.title}
          description={meta.education.description}
          action={
            isOwner ? <OwnerAddLink href={educationHref} label="Add credentials" /> : undefined
          }
        >
          <ResumeList entries={education} />
        </SectionShell>
      ) : null}

      {showSkills ? (
        <SectionShell
          id="skills"
          title={meta.skills.title}
          description={meta.skills.description}
          action={isOwner ? <OwnerAddLink href="/settings/profile" label="Manage skills" /> : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-[#E5E7EB] bg-[#F3F4F6] px-3 py-1.5 text-[12.5px] font-medium text-[#374151]"
              >
                {skill}
              </span>
            ))}
          </div>
        </SectionShell>
      ) : null}

      {showPortfolio ? (
        <SectionShell
          id="portfolio"
          title={meta.portfolio.title}
          description={meta.portfolio.description}
          action={isOwner ? <OwnerAddLink href="/settings/profile" label="Add project" /> : undefined}
        >
          <IdentityPortfolio items={payload.portfolio} className="[&>div:first-child]:hidden" />
        </SectionShell>
      ) : null}

      {showBusiness ? (
        <SectionShell
          id="business"
          title={meta.business.title}
          description={meta.business.description}
          action={
            isOwner ? (
              <OwnerAddLink href="/settings/profile#field-social" label="Add details" />
            ) : undefined
          }
        >
          {businessEntries.length > 0 ? (
            <div className="mb-5">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
                Brands & campaigns
              </p>
              <div className="flex flex-wrap gap-2">
                {businessEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5"
                  >
                    <Building2 className="h-3.5 w-3.5 text-[#9CA3AF]" />
                    <span className="text-[12.5px] font-medium text-[#111827]">{entry.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-6">
            {surfaces.map((surface) => (
              <IdentityModulePanel key={surface} surface={surface} username={profile.username} />
            ))}
          </div>
        </SectionShell>
      ) : null}

      {showServices ? (
        <SectionShell
          id="services"
          title={meta.services.title}
          description={meta.services.description}
          action={isOwner ? <OwnerAddLink href={servicesHref} label="Add services" /> : undefined}
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <ServiceFlag label="In-app messages" enabled={profile.contactPreferences.in_app} />
              <ServiceFlag label="Email inquiries" enabled={profile.contactPreferences.email} />
              <ServiceFlag label="Bookings" enabled={profile.contactPreferences.booking} />
            </div>

            {isOwner ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-5 text-center">
                <p className="text-[14px] font-semibold text-[#111827]">Manage your booking inbox</p>
                <p className="mt-1 text-[12.5px] text-[#6B7280]">
                  Review requests and update availability from your dedicated bookings area.
                </p>
                <Link href="/identity/bookings" className="mt-3 inline-block">
                  <IdentityButton size="sm">Open booking inbox</IdentityButton>
                </Link>
              </div>
            ) : payload.canBook ? (
              <IdentityCard className="border-[#E5E7EB] p-5 shadow-none">
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
                  Send a request
                </p>
                <IdentityBookingForm
                  creatorId={profile.userId}
                  creatorName={displayName}
                  onClose={() => {}}
                  inline
                />
              </IdentityCard>
            ) : profile.availability === "unavailable" ? (
              <p className="text-center text-[13px] text-[#9CA3AF]">
                {displayName} isn&apos;t taking bookings right now.
              </p>
            ) : (
              <p className="text-center text-[13px] text-[#9CA3AF]">
                <Link href="/login" className="font-semibold text-[#FF5A1F] hover:underline">
                  Sign in
                </Link>{" "}
                to contact {displayName}.
              </p>
            )}
          </div>
        </SectionShell>
      ) : null}
    </div>
  );
}

function ServiceFlag({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3",
        enabled ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-[#E5E7EB] bg-[#F9FAFB]",
      )}
    >
      <p className="text-[13px] font-semibold text-[#111827]">{label}</p>
      <p className={cn("mt-0.5 text-[12px]", enabled ? "text-[#15803D]" : "text-[#9CA3AF]")}>
        {enabled ? "Available" : "Unavailable"}
      </p>
    </div>
  );
}
