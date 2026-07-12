import type { CopilotMessage } from "./types";

const SESSION_KEY = "jimvio_copilot_session_v1";
const MAX_MESSAGES = 40;

export function loadCopilotSession(): CopilotMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-MAX_MESSAGES) as CopilotMessage[];
  } catch {
    return [];
  }
}

export function saveCopilotSession(messages: CopilotMessage[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch {
    // quota or private mode
  }
}

export function clearCopilotSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // silent
  }
}
