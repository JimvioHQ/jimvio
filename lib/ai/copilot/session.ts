import type { CopilotMessage } from "./types";

const SESSION_KEY = "jimvio_copilot_session_v1";
const DRAFT_KEY = "jimvio_copilot_draft_v1";
const RETURN_KEY = "jimvio_copilot_return_v1";
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

export function loadCopilotDraft() {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveCopilotDraft(draft: string) {
  if (typeof window === "undefined") return;
  try {
    if (!draft) sessionStorage.removeItem(DRAFT_KEY);
    else sessionStorage.setItem(DRAFT_KEY, draft.slice(0, 4000));
  } catch {
    // quota or private mode
  }
}

export function loadCopilotReturnPath() {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(RETURN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveCopilotReturnPath(path: string) {
  if (typeof window === "undefined") return;
  try {
    if (!path || path === "/ai") sessionStorage.removeItem(RETURN_KEY);
    else sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    // silent
  }
}
