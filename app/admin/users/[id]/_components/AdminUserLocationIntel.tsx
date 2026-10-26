"use client";

import { useState, type ElementType } from "react";
import { Clock, Globe, MapPin, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminUserLocationView } from "@/lib/admin/user-location-view";

function fmtDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function text(value: string | null | undefined) {
  return value && value.trim() ? value : "Not available";
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
        <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 border-b border-[var(--color-border)]/50 last:border-0">
      <p className="text-[11.5px] text-[var(--color-text-muted)]">{label}</p>
      <p className="text-[12.5px] text-[var(--color-text-primary)] font-medium mt-0.5 break-words">{value}</p>
    </div>
  );
}

export function AdminUserLocationIntel({ location }: { location: AdminUserLocationView | null | undefined }) {
  const [showMap, setShowMap] = useState(false);
  const facts = location?.facts ?? [];
  const map = location?.map ?? null;

  return (
    <>
      <Section title="Country and location" icon={MapPin}>
        <div className="px-4 py-1">
          {location?.conflict && (
            <p className="py-2.5 text-[12px] text-amber-700 dark:text-amber-400 border-b border-[var(--color-border)]/50">
              The account country and the latest IP estimate do not match.
            </p>
          )}
          {facts.length === 0 ? (
            <p className="py-3 text-[12px] text-[var(--color-text-muted)]">Not available</p>
          ) : facts.map((fact) => (
            <div key={fact.id} className="py-2.5 border-b border-[var(--color-border)]/50 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11.5px] text-[var(--color-text-muted)]">{fact.title}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  {fact.sourceLabel}
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--color-text-primary)] font-medium mt-0.5 break-words">{fact.value}</p>
              {fact.note && (
                <p className="text-[11.5px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{fact.note}</p>
              )}
              <p className="text-[10.5px] text-[var(--color-text-muted)] mt-0.5">
                {fact.updatedAt ? `Updated ${fmtDate(fact.updatedAt)}` : "No update time recorded"}
                {fact.confidence !== "none" ? ` · confidence ${fact.confidence}` : ""}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Address components" icon={MapPin}>
        <div className="px-4 py-1">
          <p className="py-2.5 text-[11.5px] text-[var(--color-text-muted)] leading-relaxed border-b border-[var(--color-border)]/50">
            Only levels returned by a source are listed. A missing village, sector, or postal code is not filled in.
          </p>
          {(location?.addressComponents.length ?? 0) === 0 ? (
            <p className="py-3 text-[12px] text-[var(--color-text-muted)]">Not available</p>
          ) : location?.addressComponents.map((component) => (
            <div key={`${component.sourceLabel}-${component.label}`} className="py-2.5 border-b border-[var(--color-border)]/50 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11.5px] text-[var(--color-text-muted)]">{component.label}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  {component.sourceLabel}{component.approximate ? " · approximate" : ""}
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--color-text-primary)] font-medium mt-0.5 break-words">{component.value}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Map and coordinates" icon={MapPin}>
        <div className="px-4 py-1">
          {!map ? (
            <p className="py-3 text-[12px] text-[var(--color-text-muted)]">Not available</p>
          ) : (
            <div className="py-2.5 space-y-2">
              <Row label="Latitude" value={map.latitude.toFixed(5)} />
              <Row label="Longitude" value={map.longitude.toFixed(5)} />
              <Row
                label="Accuracy"
                value={map.accuracyMeters == null ? "Not available" : `About ${Math.round(map.accuracyMeters)} meters`}
              />
              <Row label="Source" value={`${map.sourceLabel}${map.approximate ? " · approximate" : ""}`} />
              <p className="text-[11.5px] text-[var(--color-text-muted)] leading-relaxed">{map.note}</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={map.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium text-orange-500 hover:underline"
                >
                  Open in Google Maps
                </a>
                <a
                  href={map.openStreetMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium text-orange-500 hover:underline"
                >
                  Open in OpenStreetMap
                </a>
                {!showMap && (
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className="text-[12px] font-medium text-orange-500 hover:underline"
                  >
                    Show map
                  </button>
                )}
              </div>
              {showMap && (
                <iframe
                  title="Location map"
                  src={map.embedUrl}
                  className="mt-1 h-48 w-full rounded-lg border border-[var(--color-border)]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
              {showMap && (
                <p className="text-[10.5px] text-[var(--color-text-muted)]">
                  The map loads from OpenStreetMap after this click. It shows the coordinate above, not proof of residence.
                </p>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title="IP and network" icon={Globe}>
        <div className="px-4 py-1">
          <Row label="IP address" value={text(location?.network.ip)} />
          <Row label="IP country" value={text(location?.network.country)} />
          <Row label="IP region" value={text(location?.network.region)} />
          <Row label="IP city" value={text(location?.network.city)} />
          <Row label="ISP" value="Not available" />
          <p className="pb-2 text-[11.5px] text-[var(--color-text-muted)]">No ISP provider is configured.</p>
          <Row label="Network signal" value={text(location?.network.indicator)} />
          <p className="pb-3 text-[11.5px] text-[var(--color-text-muted)] leading-relaxed">
            {location?.network.indicatorNote ?? "Not available"}
          </p>
        </div>
      </Section>

      <Section title="Device and browser" icon={ShieldCheck}>
        <div className="px-4 py-1">
          <Row label="Category" value={text(location?.device.category)} />
          <Row label="Browser" value={text(location?.device.browser)} />
          <Row label="Browser version" value={text(location?.device.browserVersion)} />
          <Row label="Operating system" value={text(location?.device.operatingSystem)} />
          <Row label="OS version" value={text(location?.device.osVersion)} />
          <Row label="Session" value={text(location?.device.sessionId)} />
          <Row label="Last active" value={text(location?.device.lastActiveAt)} />
          <Row label="User agent" value={text(location?.device.userAgentSummary)} />
          <p className="py-2.5 text-[11.5px] text-[var(--color-text-muted)] leading-relaxed">
            Parsed from the browser user agent when a session starts. The raw string, IMEI, SIM number, and installed apps are not collected.
          </p>
        </div>
      </Section>

      <Section title="Session history" icon={Clock}>
        {(location?.sessions.length ?? 0) === 0 ? (
          <p className="px-4 py-3 text-[12px] text-[var(--color-text-muted)]">No sessions recorded.</p>
        ) : (
          <div className="px-4 py-1">
            {location?.sessions.map((session) => (
              <div key={session.id} className="py-2.5 border-b border-[var(--color-border)]/50 last:border-0">
                <p className="text-[12.5px] font-medium text-[var(--color-text-primary)]">{session.device}</p>
                <p className="text-[11.5px] text-[var(--color-text-muted)] mt-0.5">
                  {session.category}
                  {session.browser ? ` · ${session.browser}` : ""}
                  {session.browserVersion ? ` ${session.browserVersion}` : " · browser version not available"}
                  {session.operatingSystem ? ` · ${session.operatingSystem}` : ""}
                  {session.osVersion ? ` ${session.osVersion}` : ""}
                </p>
                <p className="text-[11.5px] text-[var(--color-text-muted)] mt-0.5 break-all">
                  IP {session.ip} · IP-estimated {[session.ipCity, session.ipRegion, session.ipCountry].filter(Boolean).join(", ") || "Not available"}
                </p>
                <p className="text-[10.5px] text-[var(--color-text-muted)] mt-0.5">
                  Last active {session.lastActiveAt}
                  {session.current ? " · current" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Source and confidence" icon={ShieldCheck}>
        <div className={cn("px-4 py-1")}>
          {facts.map((fact) => (
            <Row
              key={fact.id}
              label={fact.title}
              value={`${fact.sourceLabel} · ${fact.confidence} · ${fact.updatedAt ? fmtDate(fact.updatedAt) : "no time"}`}
            />
          ))}
          <p className="py-2.5 text-[11.5px] text-[var(--color-text-muted)] leading-relaxed">
            {location?.geocoderNote ?? "Not available"}
          </p>
        </div>
      </Section>
    </>
  );
}
