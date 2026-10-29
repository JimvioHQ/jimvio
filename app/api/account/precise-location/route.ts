import { NextResponse } from "next/server";
import { preciseLocationCommand, summarizePreciseLocation } from "@/lib/geo/precise-location";
import {
  clearPreciseLocation,
  saveDeclinedLocation,
  saveSharedLocation,
} from "@/lib/geo/precise-location-store";
import { rateLimit } from "@/lib/ops/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { syncCountryFromDevice } from "@/lib/geo/country-trust-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: unknown = null;
  try {
    const text = await request.text();
    if (text.length > 4_000) {
      return NextResponse.json({ error: "Could not save location" }, { status: 400 });
    }
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "Could not save location" }, { status: 400 });
  }

  const command = preciseLocationCommand(user?.id ?? null, body);
  if (command.type === "unauthorized") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (command.type === "invalid") {
    return NextResponse.json({ error: "Could not save location" }, { status: 400 });
  }

  const limit = rateLimit(`precise-location:${command.userId}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Try again later" }, { status: 429 });
  }

  try {
    if (command.type === "clear") {
      await clearPreciseLocation(command.userId);
      return NextResponse.json(summarizePreciseLocation(null));
    }
    if (command.type === "decline") {
      await saveDeclinedLocation(command.userId);
      return NextResponse.json({
        permission: "denied",
        capturedAt: null,
        expiresAt: null,
        geocodeState: "not_requested",
      });
    }
    const saved = await saveSharedLocation(command);
    await syncCountryFromDevice(command.userId).catch(() => undefined);
    return NextResponse.json(summarizePreciseLocation(saved));
  } catch {
    return NextResponse.json({ error: "Could not save location" }, { status: 500 });
  }
}
