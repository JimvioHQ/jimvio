// components/workspace/sections/SpacesSection.tsx
import { Layers } from "lucide-react";
import { EmptyComingSoon } from "../emptyComingSoon";

export function SpacesSection() {
  return (
    <EmptyComingSoon
      icon={Layers}
      title="Spaces & Rooms"
      description="Sub-spaces inside this community for focused conversations — chat rooms, voice rooms, and topic threads. Owners will be able to create and configure spaces with custom rules."
      buildPhase="Phase 2"
    />
  );
}











