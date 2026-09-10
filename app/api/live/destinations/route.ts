import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { platformLabel, platformReadiness } from "@/lib/live/destinations/capabilities";
import { isEncryptionConfigured } from "@/lib/live/destinations/encryption";
import { validateRtmpUrl } from "@/lib/live/destinations/ssrf";
import {
  createCustomRtmpDestination,
  listUserDestinations,
} from "@/lib/live/destinations/repository";
import type { DestinationPlatform } from "@/lib/live/destinations/types";

export const dynamic = "force-dynamic";

const CATALOG: DestinationPlatform[] = [
  "jimvio",
  "youtube",
  "twitch",
  "facebook",
  "instagram",
  "tiktok",
  "custom_rtmp",
];

/** GET — list connected destinations + platform catalog readiness */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const destinations = await listUserDestinations(user.id);
  const catalog = CATALOG.map((platform) => {
    const readiness = platformReadiness(platform);
    return {
      platform,
      label: platformLabel(platform),
      status: readiness.status,
      message: readiness.message,
      oauthConfigured: readiness.oauthConfigured,
      connectPath:
        readiness.status === "supported" &&
        ["youtube", "twitch", "facebook"].includes(platform)
          ? `/api/integrations/${platform}/start`
          : null,
      canAddCustom: platform === "custom_rtmp",
    };
  });

  return NextResponse.json({
    destinations,
    catalog,
    encryptionConfigured: isEncryptionConfigured(),
    jimvio: {
      platform: "jimvio",
      label: "Jimvio",
      status: "live" as const,
      alwaysOn: true,
    },
  });
}

/** POST — create Custom RTMP destination */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      {
        error:
          "Destination encryption is not configured. Set LIVE_DESTINATION_ENCRYPTION_KEY.",
      },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    platform?: string;
    displayName?: string;
    rtmpUrl?: string;
    streamKey?: string;
  };

  if (body.platform !== "custom_rtmp") {
    return NextResponse.json(
      { error: "Only custom_rtmp can be created via this endpoint" },
      { status: 400 }
    );
  }

  const name = (body.displayName ?? "Custom RTMP").trim().slice(0, 120);
  const urlCheck = validateRtmpUrl(body.rtmpUrl ?? "");
  if (!urlCheck.ok) {
    return NextResponse.json({ error: urlCheck.error }, { status: 400 });
  }
  const streamKey = (body.streamKey ?? "").trim();
  if (!streamKey || streamKey.length > 256) {
    return NextResponse.json({ error: "Valid stream key is required" }, { status: 400 });
  }

  try {
    const destination = await createCustomRtmpDestination({
      userId: user.id,
      displayName: name,
      rtmpUrl: urlCheck.normalizedUrl,
      streamKey,
    });
    return NextResponse.json({ destination });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create destination" },
      { status: 400 }
    );
  }
}
