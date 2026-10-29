import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APPLY_ERRORS, cleanApplication } from "@/lib/founding/program";

export const dynamic = "force-dynamic";

/** N-7: apply for a Founding Creator seat. Jimvio reviews and decides. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: APPLY_ERRORS.not_signed_in }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const clean = cleanApplication(body);
  if (!clean.ok) return NextResponse.json({ error: clean.error }, { status: 400 });

  const { data, error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: { status: string } | null; error: { message: string } | null }>;
  }).rpc("submit_founding_application", {
    p_contributions: clean.contributions,
    p_note: clean.note,
    p_links: clean.links,
  });

  if (error || !data) {
    const code = Object.keys(APPLY_ERRORS).find((k) => error?.message?.includes(k));
    return NextResponse.json(
      { error: code ? APPLY_ERRORS[code] : "Your application could not be sent. Try again." },
      { status: code === "program_full" || code === "already_founder" ? 409 : 400 },
    );
  }
  return NextResponse.json({ status: data.status });
}
