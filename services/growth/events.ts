import { getAdminDB } from "@/services/base";

export function isAllowedGrowthEvent(eventName: string): boolean {
  return /^growth[._-]/.test(eventName);
}

/** Best-effort instrumentation. Event delivery must never block a user flow. */
export async function trackGrowthEvent(
  userId: string | null,
  eventName: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!isAllowedGrowthEvent(eventName)) return;

  try {
    const { error } = await (getAdminDB() as any).from("growth_events").insert({
      user_id: userId,
      event_name: eventName,
      properties,
    });
    if (error) console.warn("[growth] event not recorded:", error.message);
  } catch (error) {
    console.warn("[growth] event recording failed:", error);
  }
}
