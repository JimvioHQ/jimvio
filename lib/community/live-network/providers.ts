/**
 * Live media provider registry — LiveKit default, others reserved.
 */

import type {
  LiveMediaProvider,
  LiveMediaVendor,
  LiveStudioControls,
  LiveStudioLayout,
} from "./types";

const DEFAULT_CONTROLS: LiveStudioControls = {
  camera: true,
  microphone: true,
  screenShare: false,
  windowShare: false,
  backgroundBlur: true,
  noiseSuppression: true,
  recording: false,
  replayReady: false,
  layout: "presentation",
  scene: "Main",
  liveSeconds: 0,
  connectionQuality: "good",
};

const LAYOUTS: LiveStudioLayout[] = [
  "presentation",
  "grid",
  "screen_share",
  "classroom",
  "spotlight",
  "cinema",
];

function makeProvider(
  id: LiveMediaVendor,
  label: string,
  maxHosts: number,
  available: boolean
): LiveMediaProvider {
  return {
    id,
    label: available ? label : `${label} (reserved)`,
    getStudioDefaults: () => ({ ...DEFAULT_CONTROLS }),
    listLayouts: () => [...LAYOUTS],
    maxHosts: () => maxHosts,
  };
}

/** Thin LiveKit adapter — media plane stays in lib/live/*; this is the pluggable face. */
export const livekitMediaProvider: LiveMediaProvider = {
  ...makeProvider("livekit", "LiveKit", 12, true),
  id: "livekit",
  label: "LiveKit",
};

export const dailyMediaProvider = makeProvider("daily", "Daily", 12, false);
export const agoraMediaProvider = makeProvider("agora", "Agora", 12, false);
export const hundredMsMediaProvider = makeProvider("100ms", "100ms", 12, false);
export const webrtcMediaProvider = makeProvider("webrtc", "WebRTC", 8, false);
export const localMediaProvider = makeProvider("local", "Local preview", 12, true);

const REGISTRY: Partial<Record<LiveMediaVendor, LiveMediaProvider>> = {
  livekit: livekitMediaProvider,
  daily: dailyMediaProvider,
  agora: agoraMediaProvider,
  "100ms": hundredMsMediaProvider,
  webrtc: webrtcMediaProvider,
  local: localMediaProvider,
};

let activeVendor: LiveMediaVendor = "livekit";

export function setLiveMediaVendor(vendor: LiveMediaVendor) {
  if (REGISTRY[vendor]) activeVendor = vendor;
}

export function getLiveMediaVendor(): LiveMediaVendor {
  return activeVendor;
}

export function getLiveMediaProvider(): LiveMediaProvider {
  return REGISTRY[activeVendor] ?? livekitMediaProvider;
}

export function listLiveMediaProviders(): LiveMediaProvider[] {
  return Object.values(REGISTRY).filter(Boolean) as LiveMediaProvider[];
}

export function registerLiveMediaProvider(provider: LiveMediaProvider) {
  REGISTRY[provider.id] = provider;
}
