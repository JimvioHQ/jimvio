// types/workspace.ts
export interface WorkspaceCommunity {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  cover_image: string | null;
  member_count: number;
  owner_id: string;
}

export type WorkspaceRole = "member" | "moderator" | "admin" | "owner";
export type WorkspaceView = "member" | "admin";

export type WorkspaceSection =
  | "feed"
  | "messages"
  | "spaces"
  | "live"
  | "missions"
  | "courses"
  | "events"
  | "members"
  | "leaderboard"
  | "resources";

export interface WorkspaceSectionConfig {
  key: WorkspaceSection;
  label: string;
  iconName:
  | "Home"
  | "Layers"
  | "Radio"
  | "Target"
  | "GraduationCap"
  | "Calendar"
  | "Users"
  | "BookOpen";
  ready: boolean; // true = real content, false = stub
}