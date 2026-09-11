/**
 * Map getUserMedia / media device failures to honest UI states.
 * Never treat every failure as "Permission denied".
 */

export type MediaAccessKind =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "not_found"
  | "unavailable"
  | "overconstrained"
  | "security"
  | "unknown";

export type MediaDeviceKind = "audio" | "video" | "both";

export type MediaAccessError = {
  kind: MediaAccessKind;
  name: string;
  /** Safe user-facing copy (no raw stack / device IDs). */
  message: string;
  /** Technical name for debug logs only. */
  technical: string;
  device: MediaDeviceKind;
};

const KIND_MESSAGES: Record<Exclude<MediaAccessKind, "idle" | "requesting" | "granted">, string> = {
  denied: "Camera or microphone access is blocked. Allow access in your browser settings, then try again.",
  not_found: "No compatible camera or microphone was found on this device.",
  unavailable:
    "The device is currently unavailable. It may be in use by another app — close it and try again.",
  overconstrained: "The selected device does not support the requested settings.",
  security: "Browser security settings prevented access to your camera or microphone.",
  unknown: "Could not access your camera or microphone.",
};

export function classifyMediaError(
  err: unknown,
  device: MediaDeviceKind = "both"
): MediaAccessError {
  const name =
    err instanceof DOMException
      ? err.name
      : err && typeof err === "object" && "name" in err && typeof (err as { name: unknown }).name === "string"
        ? (err as { name: string }).name
        : "Error";
  const rawMessage = err instanceof Error ? err.message : String(err ?? "Unknown error");
  const technical = `${name}: ${rawMessage}`;

  let kind: MediaAccessKind = "unknown";
  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    /permission denied/i.test(rawMessage)
  ) {
    kind = "denied";
  } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    kind = "not_found";
  } else if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    kind = "unavailable";
  } else if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    kind = "overconstrained";
  } else if (name === "SecurityError" || name === "TypeError") {
    // TypeError often means insecure context / mediaDevices missing
    kind = name === "SecurityError" ? "security" : "unknown";
  }

  const scoped =
    device === "video"
      ? KIND_MESSAGES[kind as keyof typeof KIND_MESSAGES]?.replace(
          /Camera or microphone|camera or microphone/gi,
          (m) => (m[0] === "C" ? "Camera" : "camera")
        )
      : device === "audio"
        ? KIND_MESSAGES[kind as keyof typeof KIND_MESSAGES]?.replace(
            /Camera or microphone|camera or microphone/gi,
            (m) => (m[0] === "C" ? "Microphone" : "microphone")
          )
        : KIND_MESSAGES[kind as keyof typeof KIND_MESSAGES];

  let message = scoped ?? KIND_MESSAGES.unknown;
  if (device === "video" && kind === "denied") {
    message = "Camera access is blocked. Allow access in your browser settings, then try again.";
  } else if (device === "audio" && kind === "denied") {
    message = "Microphone access is blocked. Allow access in your browser settings, then try again.";
  } else if (device === "video" && kind === "not_found") {
    message = "No compatible camera was found on this device.";
  } else if (device === "audio" && kind === "not_found") {
    message = "No compatible microphone was found on this device.";
  } else if (device === "video" && kind === "unavailable") {
    message = "The camera is currently unavailable. It may be in use by another app.";
  } else if (device === "audio" && kind === "unavailable") {
    message = "The microphone is currently unavailable. It may be in use by another app.";
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    kind = "security";
    message = "Camera and microphone require a secure (HTTPS) connection.";
  }

  return { kind, name, message, technical, device };
}

export function logMediaError(scope: string, classified: MediaAccessError): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[live/media] ${scope}`, classified.technical, classified.kind);
  } else {
    console.warn(`[live/media] ${scope}`, classified.kind, classified.name);
  }
}
