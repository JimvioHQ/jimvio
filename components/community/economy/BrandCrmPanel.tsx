"use client";

import Image from "next/image";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { useClientReady } from "@/lib/community/use-client-ready";
import {
  useBrandCrmStore,
  type EconomyOverviewInput,
} from "@/lib/community/economy";

export function BrandCrmPanel({
  communityId,
  overview,
  className,
}: {
  communityId: string;
  overview: EconomyOverviewInput | null | undefined;
  className?: string;
}) {
  const clientReady = useClientReady();
  const shortlistRaw = useBrandCrmStore(
    useShallow((s) => s.shortlists.filter((x) => x.communityId === communityId))
  );
  const addToShortlist = useBrandCrmStore((s) => s.addToShortlist);
  const removeFromShortlist = useBrandCrmStore((s) => s.removeFromShortlist);
  const inviteCreator = useBrandCrmStore((s) => s.inviteCreator);
  const shortlist = clientReady ? shortlistRaw : [];

  const candidates = overview?.topContributors ?? overview?.activeMembers ?? [];

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Brand CRM"
    >
      <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        Brand CRM
      </h3>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
        Search creators, shortlist, invite, track progress, approve, and release payouts.
      </p>

      <div className="mt-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Search creators
        </p>
        {candidates.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No creator signals yet in this community.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {candidates.slice(0, 5).map((c) => {
              const points =
                "points" in c && typeof c.points === "number" ? c.points : 50;
              const already = shortlist.some((s) => s.creatorId === c.id);
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative h-8 w-8 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                      {c.avatar_url ? (
                        <Image
                          src={c.avatar_url}
                          alt=""
                          fill
                          sizes="32px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-bold">
                          {c.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                        {c.name}
                      </p>
                      <p className="text-[10.5px] text-[var(--color-text-muted)]">
                        Score {Math.min(99, 50 + Math.round(points / 40))}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() =>
                      addToShortlist({
                        communityId,
                        creatorId: c.id,
                        name: c.name,
                        avatarUrl: c.avatar_url,
                        score: Math.min(99, 50 + Math.round(points / 40)),
                        note: "",
                      })
                    }
                    className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)] disabled:opacity-40"
                  >
                    {already ? "Shortlisted" : "Shortlist"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Shortlist ({shortlist.length})
        </p>
        {shortlist.length === 0 ? (
          <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
            Build a shortlist to invite and track creators.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {shortlist.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-2.5 py-2"
              >
                <div>
                  <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                    {s.name}
                  </p>
                  <p className="text-[10.5px] text-[var(--color-text-muted)]">
                    {s.note || "Ready to invite"} · score {s.score}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => inviteCreator(s.id)}
                    className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-semibold text-white"
                  >
                    Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromShortlist(s.id)}
                    className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-muted)]"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
