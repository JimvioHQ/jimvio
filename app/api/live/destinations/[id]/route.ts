import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  revokeTikTokAccess,
  revokeTwitchAccess,
  revokeYouTubeAccess,
} from "@/lib/live/destinations/adapters";
import { isEncryptionConfigured } from "@/lib/live/destinations/encryption";
import { validateRtmpUrl } from "@/lib/live/destinations/ssrf";
import {
  getDestinationCredentials,
  getDestinationForUser,
  revokeDestination,
  updateCustomRtmpDestination,
} from "@/lib/live/destinations/repository";
import { liveStudioLog } from "@/lib/live/observability";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await getDestinationForUser(id, user.id);
  if (!row) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    displayName?: string;
    rtmpUrl?: string;
    streamKey?: string;
  };

  if (row.platform !== "custom_rtmp") {
    return NextResponse.json(
      { error: "Only Custom RTMP destinations can be edited here" },
      { status: 400 }
    );
  }

  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      { error: "Destination encryption is not configured" },
      { status: 503 }
    );
  }

  if (body.rtmpUrl) {
    const check = validateRtmpUrl(body.rtmpUrl);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    body.rtmpUrl = check.normalizedUrl;
  }

  try {
    const destination = await updateCustomRtmpDestination({
      destinationId: id,
      userId: user.id,
      displayName: body.displayName,
      rtmpUrl: body.rtmpUrl,
      streamKey: body.streamKey,
    });
    return NextResponse.json({ destination });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await getDestinationForUser(id, user.id);
  if (!row) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 });
  }

  if (row.platform === "tiktok") {
    try {
      const creds = await getDestinationCredentials(id, user.id);
      if (creds?.accessToken) {
        await revokeTikTokAccess(creds.accessToken);
      }
    } catch {
      /* local disconnect still proceeds */
    }
    liveStudioLog("info", "tiktok_oauth_disconnect", { userId: user.id });
  }

  if (row.platform === "twitch") {
    try {
      const creds = await getDestinationCredentials(id, user.id);
      const token = creds?.accessToken || creds?.refreshToken;
      if (token) {
        await revokeTwitchAccess(token);
      }
    } catch {
      /* local disconnect still proceeds */
    }
    liveStudioLog("info", "twitch_oauth_disconnect", { userId: user.id });
    liveStudioLog("info", "twitch_connection_removed", { userId: user.id });
  }

  // Revoke ONLY the YouTube Live OAuth client grant (YOUTUBE_CLIENT_ID).
  // Never touches Supabase Google Login / Sign in with Google.
  if (row.platform === "youtube") {
    try {
      const creds = await getDestinationCredentials(id, user.id);
      const token = creds?.refreshToken || creds?.accessToken;
      if (token) {
        await revokeYouTubeAccess(token);
      }
    } catch {
      /* local disconnect still proceeds */
    }
    liveStudioLog("info", "youtube_oauth_disconnect", { userId: user.id });
  }

  await revokeDestination(id, user.id);
  return NextResponse.json({ ok: true });
}
