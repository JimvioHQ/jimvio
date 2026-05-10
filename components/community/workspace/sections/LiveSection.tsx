import { Radio } from "lucide-react";
import { EmptyComingSoon } from "../emptyComingSoon";

export function LiveSection() {
  return (
    <EmptyComingSoon
      icon={Radio}
      title="Live & Voice"
      description="Go live with multi-host streaming, screen share, and persistent voice rooms. Powered by WebRTC + LiveKit for sub-300ms latency."
      buildPhase="Phase 2"
    />
  );
}