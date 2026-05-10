import { BookOpen } from "lucide-react";
import { EmptyComingSoon } from "../emptyComingSoon";

export function ResourcesSection() {
  return (
    <EmptyComingSoon
      icon={BookOpen}
      title="Resources"
      description="Curated knowledge base with guides, templates, and tools. Members contribute, AI surfaces what you need via semantic search."
      buildPhase="Phase 3"
    />
  );
}