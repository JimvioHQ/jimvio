/**
 * Verifies media error classification without browser devices.
 * Usage: node scripts/verify-live-media-errors.mjs
 */

function classifyMediaError(err, device = "both") {
  const name =
    err instanceof DOMException
      ? err.name
      : err && typeof err === "object" && typeof err.name === "string"
        ? err.name
        : "Error";
  const rawMessage = err instanceof Error ? err.message : String(err ?? "Unknown error");

  let kind = "unknown";
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
  } else if (name === "SecurityError") {
    kind = "security";
  }

  let message = "Could not access your camera or microphone.";
  if (kind === "denied") {
    message =
      device === "video"
        ? "Camera access is blocked. Allow access in your browser settings, then try again."
        : device === "audio"
          ? "Microphone access is blocked. Allow access in your browser settings, then try again."
          : "Camera or microphone access is blocked. Allow access in your browser settings, then try again.";
  } else if (kind === "not_found") {
    message =
      device === "video"
        ? "No compatible camera was found on this device."
        : device === "audio"
          ? "No compatible microphone was found on this device."
          : "No compatible camera or microphone was found on this device.";
  } else if (kind === "unavailable") {
    message = "The device is currently unavailable. It may be in use by another app — close it and try again.";
  } else if (kind === "overconstrained") {
    message = "The selected device does not support the requested settings.";
  } else if (kind === "security") {
    message = "Browser security settings prevented access to your camera or microphone.";
  }

  return { kind, message, name };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const cases = [
  [new DOMException("Permission denied", "NotAllowedError"), "denied"],
  [new DOMException("Permission denied by system", "PermissionDeniedError"), "denied"],
  [new DOMException("Requested device not found", "NotFoundError"), "not_found"],
  [new DOMException("Could not start video source", "NotReadableError"), "unavailable"],
  [new DOMException("Constraints not satisfied", "OverconstrainedError"), "overconstrained"],
  [new DOMException("The operation is insecure", "SecurityError"), "security"],
  [new Error("Permission denied"), "denied"],
  [new Error("something else"), "unknown"],
];

for (const [err, expected] of cases) {
  const classified = classifyMediaError(err, "both");
  assert(classified.kind === expected, `expected ${expected}, got ${classified.kind}`);
  assert(classified.message.length > 10, "message required");
  assert(!/^Permission denied$/i.test(classified.message), "must not dump raw Permission denied alone");
}

assert(
  classifyMediaError(new DOMException("x", "NotAllowedError"), "video").message
    .toLowerCase()
    .includes("camera"),
  "video-scoped"
);
assert(
  classifyMediaError(new DOMException("x", "NotAllowedError"), "audio").message
    .toLowerCase()
    .includes("microphone"),
  "audio-scoped"
);

console.log("verify-live-media-errors: PASS");
