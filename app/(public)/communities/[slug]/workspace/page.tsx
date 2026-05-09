
"use client";

import { useSearchParams } from "next/navigation";
import { WorkspaceHome } from "@/components/community/workspace-home";
import { WorkspaceRoomView } from "@/components/community/workspace-room-view";

export default function CommunityWorkspaceHomePage() {
  const sp = useSearchParams();
  const hasRoom = !!sp.get("room");
  return hasRoom ? <WorkspaceRoomView /> : <WorkspaceHome />;
}