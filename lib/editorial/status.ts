export function statusClass(status: string) {
  if (status === "published") return "bg-[#e7f8ee] text-[#157a3a]";
  if (status === "scheduled") return "bg-[#e8f0ff] text-[#2457d6]";
  if (status === "review") return "bg-[#fff4e5] text-[#b45309]";
  return "bg-[#f2f4f7] text-[#4b5563]";
}

export function statusLabel(status: string) {
  if (status === "review") return "In review";
  if (status === "archived") return "Archived";
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}
