/**
 * Horizon-style section tree zones for the homepage template.
 * Does not change section schema — only presentation grouping.
 */

import type { ThemeSection } from "../themes/registry";

export type SectionZoneId = "header" | "template" | "footer";

export const SECTION_ZONES: Array<{
  id: SectionZoneId;
  label: string;
}> = [
  { id: "header", label: "Header" },
  { id: "template", label: "Template" },
  { id: "footer", label: "Footer" },
];

export function zoneForSectionType(type: string): SectionZoneId {
  if (type === "announcement" || type === "header") return "header";
  if (type === "footer") return "footer";
  return "template";
}

export function groupSectionsByZone(sections: ThemeSection[]): Record<
  SectionZoneId,
  Array<{ section: ThemeSection; index: number }>
> {
  const out: Record<
    SectionZoneId,
    Array<{ section: ThemeSection; index: number }>
  > = {
    header: [],
    template: [],
    footer: [],
  };
  sections.forEach((section, index) => {
    out[zoneForSectionType(section.type)].push({ section, index });
  });
  return out;
}

/** Insert index for a new template section: before first footer, else end. */
export function insertIndexForNewTemplateSection(
  sections: ThemeSection[]
): number {
  const footerIdx = sections.findIndex((s) => s.type === "footer");
  return footerIdx >= 0 ? footerIdx : sections.length;
}

export function humanSectionLabel(type: string): string {
  return type.replace(/_/g, " ");
}
