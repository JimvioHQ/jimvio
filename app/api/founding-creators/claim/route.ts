import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CLAIM_ERRORS, seatLabel } from "@/lib/founding/program";

export const dynamic = "force-dynamic";

/** N-7: claim a Founding Creator seat. Eligibility and seat numbers are decided in the database. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: CLAIM_ERRORS.not_signed_in, code: "not_signed_in" }, { status: 401 });

  const { data, error } = await (supabase as unknown as {
    rpc: (fn: string) => Promise<{ data: { seat_number: number } | null; error: { message: string } | null }>;
  }).rpc("claim_founding_seat");

  if (error || !data) {
    const code = Object.keys(CLAIM_ERRORS).find((k) => error?.message?.includes(k)) ?? "unknown";
    return NextResponse.json(
      { error: CLAIM_ERRORS[code] ?? "The seat could not be claimed. Try again.", code },
      { status: code === "not_eligible" || code === "account_inactive" ? 403 : code === "program_full" ? 409 : 400 },
    );
  }
  return NextResponse.json({ seat: data.seat_number, label: seatLabel(data.seat_number) });
}
