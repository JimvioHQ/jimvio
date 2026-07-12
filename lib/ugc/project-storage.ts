const PREFIX = "jimvio-ugc-project";

function key(campaignId: string, suffix: string) {
  return `${PREFIX}:${campaignId}:${suffix}`;
}

export type ProjectNote = {
  id: string;
  content: string;
  updatedAt: string;
};

export type ProjectFile = {
  id: string;
  name: string;
  kind: "draft" | "video" | "note" | "screenshot" | "document";
  url?: string;
  createdAt: string;
};

export type ProjectMessage = {
  id: string;
  from: "creator" | "brand" | "system";
  body: string;
  at: string;
};

export function getProjectFlags(campaignId: string) {
  if (typeof window === "undefined") return { briefRead: false, assetsDownloaded: false };
  try {
    return {
      briefRead: localStorage.getItem(key(campaignId, "brief-read")) === "1",
      assetsDownloaded: localStorage.getItem(key(campaignId, "assets-dl")) === "1",
    };
  } catch {
    return { briefRead: false, assetsDownloaded: false };
  }
}

export function markBriefRead(campaignId: string) {
  localStorage.setItem(key(campaignId, "brief-read"), "1");
}

export function markAssetsDownloaded(campaignId: string) {
  localStorage.setItem(key(campaignId, "assets-dl"), "1");
}

export function getProjectNotes(campaignId: string): ProjectNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(campaignId, "notes"));
    return raw ? (JSON.parse(raw) as ProjectNote[]) : [];
  } catch {
    return [];
  }
}

export function saveProjectNotes(campaignId: string, notes: ProjectNote[]) {
  localStorage.setItem(key(campaignId, "notes"), JSON.stringify(notes));
}

export function getProjectFiles(campaignId: string): ProjectFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(campaignId, "files"));
    return raw ? (JSON.parse(raw) as ProjectFile[]) : [];
  } catch {
    return [];
  }
}

export function saveProjectFiles(campaignId: string, files: ProjectFile[]) {
  localStorage.setItem(key(campaignId, "files"), JSON.stringify(files));
}

export function getProjectMessages(campaignId: string): ProjectMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(campaignId, "messages"));
    return raw ? (JSON.parse(raw) as ProjectMessage[]) : [];
  } catch {
    return [];
  }
}

export function appendProjectMessage(campaignId: string, msg: Omit<ProjectMessage, "id" | "at">) {
  const list = getProjectMessages(campaignId);
  list.push({
    ...msg,
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
  });
  localStorage.setItem(key(campaignId, "messages"), JSON.stringify(list));
  return list;
}
