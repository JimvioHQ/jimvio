/**
 * LiveKit Cloud often leaves `fileResults` empty on EGRESS_COMPLETE and only
 * populates the deprecated `result.file` oneof (see livekit/node-sdks#625).
 * Always read both before treating a complete egress as missing storage.
 */

import type { EgressInfo } from "livekit-server-sdk";

type EgressFileInfoLike = {
  location?: string;
  filename?: string;
  duration?: unknown;
  size?: unknown;
};

export type EgressFileResult = {
  location: string | null;
  filename: string | null;
  durationNs: number | null;
  sizeBytes: number | null;
  source: "fileResults" | "result.file" | null;
};

function asFileInfo(value: unknown): EgressFileInfoLike | null {
  if (!value || typeof value !== "object") return null;
  return value as EgressFileInfoLike;
}

export function extractEgressFileResult(info: EgressInfo): EgressFileResult {
  const fromResults = (info.fileResults?.[0] as EgressFileInfoLike | undefined) ?? null;
  const fromDeprecated =
    info.result?.case === "file" ? asFileInfo(info.result.value) : null;

  const preferred =
    fromResults && (fromResults.location || fromResults.filename)
      ? { file: fromResults, source: "fileResults" as const }
      : fromDeprecated && (fromDeprecated.location || fromDeprecated.filename)
        ? { file: fromDeprecated, source: "result.file" as const }
        : fromResults
          ? { file: fromResults, source: "fileResults" as const }
          : fromDeprecated
            ? { file: fromDeprecated, source: "result.file" as const }
            : null;

  if (!preferred) {
    return {
      location: null,
      filename: null,
      durationNs: null,
      sizeBytes: null,
      source: null,
    };
  }

  const { file, source } = preferred;
  const location =
    (typeof file.location === "string" && file.location.trim()) ||
    (typeof file.filename === "string" && file.filename.trim()) ||
    null;

  return {
    location,
    filename: typeof file.filename === "string" ? file.filename : null,
    durationNs: toFiniteNumber(file.duration),
    sizeBytes: toFiniteNumber(file.size),
    source,
  };
}

function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}
