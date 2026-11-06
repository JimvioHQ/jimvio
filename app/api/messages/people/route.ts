import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";
import { escapeLike, normalizePeopleQuery, rankPeople, type PersonHit } from "@/lib/messaging/people-search";

export const dynamic = "force-dynamic";

// Public fields only — email and phone are never selected.
const COLS = "id, full_name, username, avatar_url, bio, is_verified";

/** GET /api/messages/people?q= — signed-in users find someone to message by name or username. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to search people" }, { status: 401 });

  const limited = rateLimit(`people-search:${user.id}`, 60, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Searching too fast — slow down a little" }, { status: 429 });

  const q = normalizePeopleQuery(new URL(req.url).searchParams.get("q"));
  if (!q) return NextResponse.json({ people: [] });

  const pattern = `%${escapeLike(q)}%`;
  const base = () => supabase.from("profiles").select(COLS).neq("id", user.id).or("is_active.is.null,is_active.eq.true").limit(20);
  const [byName, byUser] = await Promise.all([base().ilike("full_name", pattern), base().ilike("username", pattern)]);
  if (byName.error && byUser.error) return NextResponse.json({ error: "Search is temporarily unavailable" }, { status: 503 });

  const rows = [...((byName.data ?? []) as PersonHit[]), ...((byUser.data ?? []) as PersonHit[])];
  return NextResponse.json({ people: rankPeople(rows, q, user.id) }, { headers: { "Cache-Control": "private, no-store" } });
}
