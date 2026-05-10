// components/workspace/sections/EventsSection.tsx

import { Calendar } from "lucide-react";
import { EmptyComingSoon } from "../emptyComingSoon";


export function EventsSection() {
  return (
    <EmptyComingSoon
      icon={Calendar}
      title="Events"
      description="Community events, challenges, and live workshops with RSVP and calendar sync. Stay notified about what's coming up."
      buildPhase="Phase 2"
    />
  );
}