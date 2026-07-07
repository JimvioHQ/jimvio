import type { OpportunityCard, OpportunityFilterId } from "./types";

export function filterOpportunities(
  items: OpportunityCard[],
  activeFilters: Set<OpportunityFilterId>,
): OpportunityCard[] {
  if (!activeFilters.size || activeFilters.has("all")) return items;

  const difficulties = new Set(["beginner", "intermediate", "advanced"]);
  const lanes = new Set(["physical", "digital", "affiliate", "ugc", "course", "community"]);

  const selectedDifficulty = [...activeFilters].find((f) => difficulties.has(f));
  const selectedLanes = [...activeFilters].filter((f) => lanes.has(f));

  return items.filter((item) => {
    const difficultyOk = !selectedDifficulty || item.difficulty === selectedDifficulty;
    const laneOk =
      selectedLanes.length === 0 || selectedLanes.some((lane) => item.lanes.includes(lane as never));
    return difficultyOk && laneOk;
  });
}
