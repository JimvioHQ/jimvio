import Link from "next/link";
import type { Metadata } from "next";
import { BadgePercent, Crown, Megaphone, ShieldCheck, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/services/db";
import { constructMetadata } from "@/lib/seo";
import { FOUNDING_FEE_MONTHS, FOUNDING_FEE_RATE, FOUNDING_SEATS, seatLabel, type FoundingSeat } from "@/lib/founding/program";
import { FoundingBadge } from "@/components/founding/FoundingBadge";
import { ClaimSeatButton } from "./ClaimSeatButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = constructMetadata({
  title: "Founding Creators",
  description: `The first ${FOUNDING_SEATS} creators building on Jimvio. A permanent numbered badge, a ${FOUNDING_FEE_RATE}% community fee for ${FOUNDING_FEE_MONTHS} months, and a place on the founders wall.`,
  path: "/founding-creators",
});

type Member = FoundingSeat & { name: string; avatar: string | null; href: string | null };

const QUALIFY = [
  { label: "Run a community", detail: "You own an active community on Jimvio.", href: "/communities/create" },
  { label: "Have a creator profile", detail: "Your creator profile is set up with your name.", href: "/activate/influencer" },
  { label: "Sell in your store", detail: "At least one of your products is live.", href: "/seller/products" },
];

const FAQ = [
  {
    q: "Is it free?",
    a: "Yes. There is no fee to join and no application to write. If you qualify, you claim a seat with one click.",
  },
  {
    q: "What does the lower fee cover?",
    a: `Paid memberships of communities you own. Jimvio's fee on those payments is ${FOUNDING_FEE_RATE}% for ${FOUNDING_FEE_MONTHS} months from the day you claim your seat. If your community already has a lower fee, the lower one stays.`,
  },
  {
    q: "Do I keep the badge?",
    a: "Yes. Your seat number never changes and is never reused.",
  },
  {
    q: "Why only 100 seats?",
    a: "Founding means early. When the 100 seats are gone, the program closes for good.",
  },
];

async function loadMembers(): Promise<Member[]> {
  const admin = getAdminDB() as unknown as {
    from: (t: string) => {
      select: (c: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: FoundingSeat[] | null }> };
    };
  };
  const { data: seats } = await admin
    .from("founding_creators")
    .select("user_id, seat_number, qualified_by, fee_rate, fee_until, joined_at")
    .order("seat_number", { ascending: true });
  const rows = seats ?? [];
  if (rows.length === 0) return [];
  const db = getAdminDB();
  const ids = rows.map((r) => r.user_id);
  const [{ data: profiles }, { data: communities }] = await Promise.all([
    db.from("profiles").select("id, full_name, username, avatar_url").in("id", ids),
    db.from("communities").select("owner_id, slug").in("owner_id", ids).eq("is_active", true).is("archived_at", null),
  ]);
  return rows.map((r) => {
    const p = profiles?.find((x) => x.id === r.user_id);
    const c = communities?.find((x) => x.owner_id === r.user_id);
    return {
      ...r,
      name: p?.full_name?.trim() || p?.username || "Jimvio creator",
      avatar: p?.avatar_url ?? null,
      href: c?.slug ? `/communities/${c.slug}` : null,
    };
  });
}

async function viewerState(): Promise<{ signedIn: boolean; seat: number | null; eligible: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, seat: null, eligible: false };
  const admin = getAdminDB() as unknown as {
    from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { seat_number: number } | null }> } } };
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: string | null }>;
  };
  const [{ data: mine }, { data: reason }] = await Promise.all([
    admin.from("founding_creators").select("seat_number").eq("user_id", user.id).maybeSingle(),
    admin.rpc("founding_creator_qualification", { p_user: user.id }),
  ]);
  return { signedIn: true, seat: mine?.seat_number ?? null, eligible: Boolean(reason) };
}

export default async function FoundingCreatorsPage() {
  const [members, viewer] = await Promise.all([loadMembers(), viewerState()]);
  const taken = members.length;
  const left = Math.max(0, FOUNDING_SEATS - taken);
  const pct = Math.min(100, Math.round((taken / FOUNDING_SEATS) * 100));

  return (
    <div className="min-h-screen bg-[var(--color-bg,#fff)]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0F1115] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#fd5000]/25 blur-3xl"
        />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-20 h-[360px] w-[360px] rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1200px] gap-10 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-white/15">
              <Crown className="h-3.5 w-3.5" /> Founding Creators
            </p>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              The first {FOUNDING_SEATS} creators
              <br />
              <span className="bg-gradient-to-r from-[#fd5000] to-amber-300 bg-clip-text text-transparent">build Jimvio with us.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/70">
              If you already run a community, a creator profile or a store on Jimvio, claim a numbered seat. It&apos;s free,
              it&apos;s permanent, and when the {FOUNDING_SEATS} seats are gone the program closes.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ClaimSeatButton signedIn={viewer.signedIn} seat={viewer.seat} eligible={viewer.eligible} full={left === 0} />
              <a href="#how" className="rounded-full px-4 py-2.5 text-[14px] font-semibold text-white/80 hover:text-white">
                How it works →
              </a>
            </div>
          </div>

          {/* Seat meter — real numbers from the database */}
          <div className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-white/50">Seats</p>
            <p className="mt-2 text-5xl font-black tabular-nums">
              {left}
              <span className="ml-2 text-lg font-semibold text-white/50">of {FOUNDING_SEATS} left</span>
            </p>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={FOUNDING_SEATS} aria-valuenow={taken} aria-label="Seats claimed">
              <div className="h-full rounded-full bg-gradient-to-r from-[#fd5000] to-amber-300" style={{ width: `${Math.max(pct, taken > 0 ? 2 : 0)}%` }} />
            </div>
            <p className="mt-3 text-[13px] text-white/60">
              {taken === 0 ? "No seats claimed yet — seat #001 is open." : `${taken} ${taken === 1 ? "seat" : "seats"} claimed.`}
            </p>
            {viewer.seat ? (
              <div className="mt-5 rounded-2xl bg-amber-300/10 p-4 ring-1 ring-amber-300/30">
                <p className="text-[13px] font-bold text-amber-200">{seatLabel(viewer.seat)}</p>
                <p className="mt-1 text-[12px] text-white/60">Your seat is yours for good.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">What founders get</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-[var(--color-text-secondary)]">
          Three things, each applied automatically by Jimvio — nothing you have to ask for.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Crown,
              title: "A permanent numbered badge",
              body: "Your seat number appears next to your name across Jimvio. It never changes and is never given to anyone else.",
            },
            {
              icon: BadgePercent,
              title: `${FOUNDING_FEE_RATE}% community fee for ${FOUNDING_FEE_MONTHS} months`,
              body: `Jimvio takes ${FOUNDING_FEE_RATE}% instead of the standard rate on paid memberships of communities you own, for ${FOUNDING_FEE_MONTHS} months from the day you claim your seat.`,
            },
            {
              icon: Megaphone,
              title: "A place on the founders wall",
              body: "Every founder is listed on this page with a link to their community, so new members can find you.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#fd5000]/10 text-[#fd5000]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-[16px] font-bold text-[var(--color-text-primary)]">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">How to get a seat</h2>
          <p className="mt-2 max-w-2xl text-[14px] text-[var(--color-text-secondary)]">
            Seats are for people already building on Jimvio. Do any one of these, then press &ldquo;Claim my seat&rdquo;.
          </p>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {QUALIFY.map((q, i) => (
              <li key={q.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg,#fff)] p-6">
                <span className="text-[12px] font-black text-[#fd5000]">0{i + 1}</span>
                <p className="mt-2 text-[15px] font-bold text-[var(--color-text-primary)]">{q.label}</p>
                <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">{q.detail}</p>
                <Link href={q.href} className="mt-4 inline-block text-[13px] font-semibold text-[#fd5000] hover:underline">
                  Start →
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
            <ShieldCheck className="h-4 w-4" /> Jimvio checks this when you claim. Seats can&apos;t be bought or assigned by hand.
          </p>
        </div>
      </section>

      {/* Founders wall */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Founders wall</h2>
            <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">Everyone who has claimed a seat, in order.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-secondary)]">
            <Users className="h-4 w-4" /> {taken} / {FOUNDING_SEATS}
          </span>
        </div>
        {members.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-14 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-[#fd5000]" />
            <p className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">Seat #001 is waiting</p>
            <p className="mx-auto mt-1 max-w-md text-[14px] text-[var(--color-text-secondary)]">
              The first founder&apos;s name goes here.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => {
              const inner = (
                <>
                  {m.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fd5000]/10 text-lg font-bold text-[#fd5000]">
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-[var(--color-text-primary)]">{m.name}</span>
                    <FoundingBadge seat={m.seat_number} compact className="mt-1" />
                  </span>
                </>
              );
              return (
                <li key={m.user_id}>
                  {m.href ? (
                    <Link href={m.href} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[#fd5000]/40">
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* FAQ */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Questions</h2>
          <dl className="mt-6 divide-y divide-[var(--color-border)]">
            {FAQ.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="text-[15px] font-bold text-[var(--color-text-primary)]">{f.q}</dt>
                <dd className="mt-1.5 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
