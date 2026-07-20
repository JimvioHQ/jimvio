import { AccessToken, type VideoGrant } from "livekit-server-sdk";
import { canPublishAv, canShareScreen, type LiveStageRole } from "@/lib/live/roles";
import {
  getLiveKitApiKey,
  getLiveKitApiSecret,
  liveKitRoomName,
} from "@/lib/live/livekit-config";

export type LiveKitTokenResult = {
  token: string;
  roomName: string;
  identity: string;
  role: LiveStageRole;
  canPublish: boolean;
  canPublishData: boolean;
};

/**
 * Issue a LiveKit JWT after Supabase auth + membership + role are already verified.
 * LiveKit carries media only — grants mirror Jimvio stage roles.
 */
export async function mintLiveKitToken(input: {
  userId: string;
  displayName?: string | null;
  sessionId: string;
  role: LiveStageRole;
}): Promise<LiveKitTokenResult> {
  const apiKey = getLiveKitApiKey();
  const apiSecret = getLiveKitApiSecret();
  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit is not configured");
  }

  const roomName = liveKitRoomName(input.sessionId);
  const canPublish = canPublishAv(input.role);
  const canPublishScreen = canShareScreen(input.role);

  const grant: VideoGrant = {
    roomJoin: true,
    room: roomName,
    canSubscribe: true,
    canPublish,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    // Screen share uses the same publish grant; role gate is enforced before mint.
  };

  // Viewers / moderators subscribe only (unless cohost/host/speaker).
  if (!canPublish && !canPublishScreen) {
    grant.canPublish = false;
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: input.userId,
    name: input.displayName?.trim() || input.userId.slice(0, 8),
    metadata: JSON.stringify({ role: input.role, sessionId: input.sessionId }),
    ttl: "2h",
  });
  at.addGrant(grant);

  const token = await at.toJwt();
  return {
    token,
    roomName,
    identity: input.userId,
    role: input.role,
    canPublish,
    canPublishData: true,
  };
}
