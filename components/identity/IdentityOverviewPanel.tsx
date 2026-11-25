import { Briefcase, Building2 } from "lucide-react";
import type { IdentityProfilePayload } from "@/lib/identity/types";
import { IdentityCard, IdentityEmptyState, IdentitySectionHeading } from "@/components/identity/identity-ui";

export function IdentityOverviewPanel({ payload }: { payload: IdentityProfilePayload }) {
  const { profile } = payload;
  const brands = payload.resume.filter((r) => r.entryType === "brand");
  const categories = Array.from(new Set([...profile.specialties, ...profile.industries]));
  const availabilityLabel = {
    open: "Open to work",
    limited: "Limited availability",
    booked: "Fully booked",
    unavailable: "Not available",
  }[profile.availability] ?? null;
  const summaryMeta = [profile.country, availabilityLabel].filter((value): value is string => Boolean(value));

  return (
    <div className="space-y-6">
      {profile.headline || profile.bio || summaryMeta.length > 0 ? (
        <IdentityCard className="p-5">
          <IdentitySectionHeading eyebrow="About" title="Professional Summary" className="mb-3" />
          {profile.headline ? (
            <p className="mb-2 max-w-2xl text-[13.5px] font-semibold leading-relaxed text-[#1C1B19]">{profile.headline}</p>
          ) : null}
          {profile.bio ? (
            <p className="max-w-2xl whitespace-pre-line text-[13.5px] leading-relaxed text-[#3E3A34]">{profile.bio}</p>
          ) : null}
          {summaryMeta.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {summaryMeta.map((item) => (
                <span key={item} className="rounded-full border border-black/[0.06] bg-black/[0.02] px-2.5 py-1 text-[11px] text-[#59544B]">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </IdentityCard>
      ) : null}

      {profile.skills.length > 0 && (
        <IdentityCard className="p-5">
          <IdentitySectionHeading eyebrow="Expertise" title="Skills" className="mb-3" />
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-black/[0.06] bg-black/[0.02] px-2.5 py-1 text-[11.5px] text-[#59544B]"
              >
                {skill}
              </span>
            ))}
          </div>
        </IdentityCard>
      )}

      {categories.length > 0 && (
        <IdentityCard className="p-5">
          <IdentitySectionHeading eyebrow="Focus" title="Specialties & industries" className="mb-3" />
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span
                key={c}
                className="rounded-full border border-[#FFDCC7] bg-[#FFF1EA] px-2.5 py-1 text-[11.5px] font-medium text-[#D6480F]"
              >
                {c}
              </span>
            ))}
          </div>
        </IdentityCard>
      )}

      {brands.length > 0 && (
        <IdentityCard className="p-5">
          <IdentitySectionHeading eyebrow="Collaborations" title="Brands worked with" className="mb-3" />
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 py-1.5"
              >
                <Building2 className="h-3.5 w-3.5 text-[#9A9388]" />
                <span className="text-[12.5px] font-medium text-[#1C1B19]">{b.title}</span>
              </div>
            ))}
          </div>
        </IdentityCard>
      )}


      {payload.portfolio.length === 0 && brands.length === 0 && !profile.bio && (
        <IdentityEmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="This profile is just getting started"
          description="Once this creator adds a bio, skills and work, it'll show up here."
        />
      )}
    </div>
  );
}

