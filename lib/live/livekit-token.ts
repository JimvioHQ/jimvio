import { AccessToken, type VideoGrant } from "livekit-server-sdk";
import { canPublishAv, canShareScreen, type LiveStageRole } from "@/lib/live/roles";
import {
  getLiveKitApiKey,
  getLiveKitApiSecret,
  liveKitRoomName,
} from "@/lib/live/livekit-config";
import {
  DEFAULT_PARTICIPANT_PERMISSIONS,
  participantMediaPublishAllowed,
  type LiveParticipantPermissions,
} from "@/lib/live/participant-permissions";

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
 * LiveKit carries media only — grants mirror Jimvio stage roles + session policy.
 */
export async function mintLiveKitToken(input: {
  userId: string;
  displayName?: string | null;
  sessionId: string;
  role: LiveStageRole;
  participantPermissions?: LiveParticipantPermissions;
}): Promise<LiveKitTokenResult> {
  const apiKey = getLiveKitApiKey();
  const apiSecret = getLiveKitApiSecret();
  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit is not configured");
  }

  const roomName = liveKitRoomName(input.sessionId);
  const perms = input.participantPermissions ?? DEFAULT_PARTICIPANT_PERMISSIONS;
  const isHostControl = input.role === "host" || input.role === "cohost";
  const roleCanPublish = canPublishAv(input.role) || canShareScreen(input.role);
  const policyAllows = isHostControl || participantMediaPublishAllowed(perms);
  const canPublish = roleCanPublish && policyAllows;

  const grant: VideoGrant = {
    roomJoin: true,
    room: roomName,
    canSubscribe: true,
    canPublish,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  };

  const at = new AccessToken(apiKey, apiSecret, {
    identity: input.userId,
    name: input.displayName?.trim() || input.userId.slice(0, 8),
    metadata: JSON.stringify({
      role: input.role,
      sessionId: input.sessionId,
      allowAudio: perms.allowAudio,
      allowVideo: perms.allowVideo,
      allowScreenShare: perms.allowScreenShare,
    }),
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
