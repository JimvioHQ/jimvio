export function isChunkLoadFailure(reason: unknown): boolean {
  const msg =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : String(reason ?? "");
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Failed to load chunk/i.test(
    msg,
  );
}

export function readChunkDeploymentId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/[?&]dpl=([^&#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function chunkReloadStorageKey(deploymentId: string | null, pathname: string): string {
  const scope = deploymentId?.trim() || pathname || "session";
  return `jimvio-chunk-reload:${scope}`;
}

export type ChunkRecoveryDecision = "reload" | "offline" | "manual" | "ignore";

/**
 * One automatic reload for a chunk failure while online.
 * A second failure for the same deployment, or an offline device, stays on the manual recovery screen.
 */
export function decideChunkRecovery(input: {
  isChunkError: boolean;
  online: boolean;
  alreadyAttempted: boolean;
}): ChunkRecoveryDecision {
  if (!input.isChunkError) return "ignore";
  if (!input.online) return "offline";
  if (input.alreadyAttempted) return "manual";
  return "reload";
}
