import { NextResponse } from "next/server";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { getAdminDB } from "@/services/db";
import { loadActivitySignals } from "@/lib/founding/signals";
import { seatLabel } from "@/lib/founding/program";
import { notifyUser } from "@/lib/notifications/notify-user";

export const dynamic = "force-dynamic";

type AppRow = {
  id: string;
  user_id: string;
  contributions: string[];
  note: string;
  links: string[];
  status: "pending" | "approved" | "declined";
  decision_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type LooseDb = {
  from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: { seat_number: number } | null; error: { message: string } | null }>;
};

/** Reviewer queue: applications with each applicant's real activity. */
export async function GET(req: Request) {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const status = new URL(req.url).searchParams.get("status") ?? "pending";
  const db = getAdminDB() as unknown as LooseDb;

  let q = db.from("founding_applications").select("*").order("created_at", { ascending: true }).limit(100);
  if (status !== "all") q = q.eq("status", status);
  const { data: rows } = (await q) as { data: AppRow[] | null };
  const apps = rows ?? [];
  const ids = apps.map((a) => a.user_id);

  const [{ data: profiles }, { count: seatsTaken }] = await Promise.all([
    ids.length
      ? db.from("profiles").select("id, full_name, username, avatar_url, email").in("id", ids)
      : Promise.resolve({ data: [] }),
    db.from("founding_creators").select("user_id", { count: "exact", head: true }),
  ]);
  const signals = await Promise.all(apps.map((a) => loadActivitySignals(a.user_id)));

  return NextResponse.json({
    seatsTaken: seatsTaken ?? 0,
    applications: apps.map((a, i) => {
      const p = (profiles ?? []).find((x: { id: string }) => x.id === a.user_id) as
        | { full_name?: string; username?: string; avatar_url?: string; email?: string }
        | undefined;
      return {
        ...a,
        name: p?.full_name || p?.username || p?.email || "Jimvio user",
        email: p?.email ?? null,
        avatar: p?.avatar_url ?? null,
        signals: signals[i],
      };
    }),
  });
}

/** Approve (assigns the next seat number) or decline with a reason. */
export async function PATCH(req: Request) {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await req.json().catch(() => ({}))) as { id?: string; decision?: string; note?: string };
  if (!body.id || (body.decision !== "approve" && body.decision !== "decline")) {
    return NextResponse.json({ error: "id and decision are required" }, { status: 400 });
  }
  const db = getAdminDB() as unknown as LooseDb;
  const { data: app } = (await db.from("founding_applications").select("id, user_id, status").eq("id", body.id).maybeSingle()) as {
    data: Pick<AppRow, "id" | "user_id" | "status"> | null;
  };
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  if (body.decision === "approve") {
    const { data: seat, error } = await db.rpc("grant_founding_seat", { p_application: app.id, p_reviewer: auth.user.id });
    if (error || !seat) {
      return NextResponse.json(
        { error: error?.message?.includes("program_full") ? "All 100 seats are taken." : "Could not approve." },
        { status: 400 },
      );
    }
    await notifyUser(getAdminDB() as never, {
      userId: app.user_id,
      type: "system",
      title: `You're ${seatLabel(seat.seat_number)}`,
      message: "Your Founding Creator application was approved. Your badge and 10% community fee are active now.",
      actionUrl: "/founding-creators",
      data: { event: "founding_approved", seat: seat.seat_number },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, seat: seat.seat_number });
  }

  const reason = (body.note ?? "").trim().slice(0, 500);
  if (reason.length < 5) return NextResponse.json({ error: "Give the applicant a short reason." }, { status: 400 });
  await db
    .from("founding_applications")
    .update({ status: "declined", decision_note: reason, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", app.id)
    .eq("status", "pending");
  await notifyUser(getAdminDB() as never, {
    userId: app.user_id,
    type: "system",
    title: "Founding Creator application",
    message: `Not approved this time: ${reason} You can apply again in 14 days.`,
    actionUrl: "/founding-creators",
    data: { event: "founding_declined" },
  }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
