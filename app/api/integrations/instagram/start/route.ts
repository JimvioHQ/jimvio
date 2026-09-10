import { NextResponse } from "next/server";
import { platformReadiness } from "@/lib/live/destinations/capabilities";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = platformReadiness("instagram");
  return NextResponse.json(
    {
      error:
        readiness.message ??
        "Instagram Live requires Meta/Instagram Live API eligibility and App Review.",
      status: "requires_approval",
    },
    { status: 403 }
  );
}
