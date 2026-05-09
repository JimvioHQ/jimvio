// "use client";

// import React, { useEffect, useMemo } from "react";
// import { useParams, useRouter, useSearchParams } from "next/navigation";
// import { Loader2, LayoutGrid } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useWorkspace } from "@/components/community/workspace-context";
// import { WorkspaceRoomOverlay } from "@/components/community/workspace-room-overlay";
// import { PostsRoom } from "@/components/community/rooms/PostsRoom";
// import { ChatRoom } from "@/components/community/rooms/ChatRoom";
// import { CourseRoom } from "@/components/community/rooms/CourseRoom";
// import { TasksRoom } from "@/components/community/rooms/TasksRoom";
// import { ResourcesRoom } from "@/components/community/rooms/ResourcesRoom";
// import { canAccessRoomNav } from "@/lib/community-workspace-access";

// export function WorkspaceRoomView() {
//   const router = useRouter();
//   const params = useParams();
//   const searchParams = useSearchParams();
//   const slug = params.slug as string;
//   const { spacesWithRooms, communityId, communityName, ownerId, userId, membership } = useWorkspace();

//   const spaceId = searchParams.get("space") || "";
//   const roomId = searchParams.get("room") || "";
//   const hubMode = searchParams.get("hub") === "1" && !searchParams.get("room");

//   const firstPick = useMemo(() => {
//     for (const s of spacesWithRooms) {
//       if (s.rooms.length) return { spaceId: s.id, roomId: s.rooms[0].id };
//     }
//     return null;
//   }, [spacesWithRooms]);

//   useEffect(() => {
//     if (!firstPick) return;
//     if (hubMode) return;
//     if (!spaceId || !roomId) {
//       router.replace(`/communities/${slug}/workspace?space=${firstPick.spaceId}&room=${firstPick.roomId}`);
//     }
//   }, [firstPick, hubMode, roomId, router, slug, spaceId]);

//   const resolved = useMemo(() => {
//     for (const s of spacesWithRooms) {
//       const r = s.rooms.find((x) => x.id === roomId);
//       if (r && s.id === spaceId) return { space: s, room: r };
//     }
//     for (const s of spacesWithRooms) {
//       const r = s.rooms.find((x) => x.id === roomId);
//       if (r) return { space: s, room: r };
//     }
//     return null;
//   }, [spacesWithRooms, spaceId, roomId]);

//   const base = `/communities/${slug}/workspace`;

//   function closeRoomOverlay() {
//     router.push(`${base}?hub=1`);
//   }

//   if (!firstPick && spacesWithRooms.length === 0) {
//     return (
//       <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--color-text-muted)]">
//         No spaces yet. Ask an admin to add spaces and rooms.
//       </div>
//     );
//   }

//   if (hubMode) {
//     if (!firstPick) {
//       return (
//         <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--color-text-muted)]">
//           No spaces yet. Ask an admin to add spaces and rooms.
//         </div>
//       );
//     }
//     return (
//       <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
//         <div className="w-full max-w-md rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[0_24px_60px_-28px_rgba(67,51,96,0.25)] text-center space-y-4">
//           <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-sm bg-[var(--color-accent-light)] text-[var(--color-accent)]">
//             <LayoutGrid className="h-7 w-7" />
//           </div>
//           <div>
//             <h2 className="text-xl font-black text-[var(--color-text-primary)]">Workspace home</h2>
//             <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
//               Open any room from the sidebar — it fills the screen so chat, courses, tasks, and posts stay focused and easy to use.
//             </p>
//           </div>
//           <Button
//             type="button"
//             className="w-full rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black h-11"
//             onClick={() => router.push(`${base}?space=${firstPick.spaceId}&room=${firstPick.roomId}`)}
//           >
//             Open a room
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   if (!spaceId || !roomId || !resolved) {
//     return (
//       <div className="flex flex-1 items-center justify-center gap-2 text-[var(--color-text-muted)]">
//         <Loader2 className="h-5 w-5 animate-spin" />
//         Loading…
//       </div>
//     );
//   }

//   const { space, room } = resolved;
//   const canEnter = canAccessRoomNav(
//     { is_locked: room.is_locked, access_type: room.access_type },
//     space.access_type,
//     membership,
//     ownerId,
//     userId,
//     space.id
//   );

//   if (!canEnter) {
//     return (
//       <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
//         <p className="text-sm font-bold text-[var(--color-text-muted)]">You don&apos;t have access to this room.</p>
//         <button
//           type="button"
//           className="text-sm font-black text-[var(--color-accent)]"
//           onClick={() => router.push(`/communities/${slug}/subscribe`)}
//         >
//           Upgrade plan
//         </button>
//       </div>
//     );
//   }

//   const common = { roomId: room.id, roomName: room.name, communityId, slug, hideHeader: true as const };

//   const roomInner = (() => {
//     switch (room.room_type) {
//       case "posts":
//         return <PostsRoom {...common} />;
//       case "chat":
//         return <ChatRoom {...common} />;
//       case "course":
//         return <CourseRoom {...common} />;
//       case "tasks":
//         return <TasksRoom {...common} />;
//       case "resources":
//         return <ResourcesRoom {...common} />;
//       default:
//         return (
//           <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--color-text-muted)]">
//             Unsupported room type: {room.room_type}
//           </div>
//         );
//     }
//   })();

//   return (
//     <WorkspaceRoomOverlay
//       communityName={communityName}
//       spaceName={space.name}
//       spaceIcon={space.icon}
//       roomName={room.name}
//       roomType={room.room_type}
//       onClose={closeRoomOverlay}
//     >
//       {roomInner}
//     </WorkspaceRoomOverlay>
//   );
// }

// components/community/workspace-room-view.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";
import { WorkspaceRoomOverlay } from "@/components/community/workspace-room-overlay";
import { PostsRoom } from "@/components/community/rooms/PostsRoom";
import { ChatRoom } from "@/components/community/rooms/ChatRoom";
import { CourseRoom } from "@/components/community/rooms/CourseRoom";
import { TasksRoom } from "@/components/community/rooms/TasksRoom";
import { ResourcesRoom } from "@/components/community/rooms/ResourcesRoom";
import { canAccessRoomNav } from "@/lib/community-workspace-access";

export function WorkspaceRoomView() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = typeof params.slug === "string" ? params.slug : Array.isArray(params.slug) ? params.slug[0] : "";
  const { spacesWithRooms, communityId, communityName, ownerId, userId, membership } = useWorkspace();

  const spaceId = searchParams.get("space") || "";
  const roomId = searchParams.get("room") || "";

  const resolved = useMemo(() => {
    // Prefer exact (space + room) match
    for (const s of spacesWithRooms) {
      const r = s.rooms.find((x) => x.id === roomId);
      if (r && s.id === spaceId) return { space: s, room: r };
    }
    // Fallback: room only — lets users share /workspace?room=X without space
    for (const s of spacesWithRooms) {
      const r = s.rooms.find((x) => x.id === roomId);
      if (r) return { space: s, room: r };
    }
    return null;
  }, [spacesWithRooms, spaceId, roomId]);

  const base = `/communities/${slug}/workspace`;

  function closeRoomOverlay() {
    router.push(base);
  }

  // Loading or invalid state
  if (!spaceId || !roomId) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-[var(--color-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">Room not found</p>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          It may have been removed or moved to another space.
        </p>
        <button
          type="button"
          onClick={() => router.push(base)}
          className="inline-flex h-9 items-center gap-1 px-4 text-[13px] font-medium text-white"
          style={{
            background: "var(--color-accent)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          Back to workspace <ArrowRight size={13} />
        </button>
      </div>
    );
  }

  const { space, room } = resolved;
  const canEnter = canAccessRoomNav(
    { is_locked: room.is_locked, access_type: room.access_type },
    space.access_type, membership, ownerId, userId, space.id
  );

  if (!canEnter) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center"
          style={{
            background: "var(--color-surface-secondary)",
            color: "var(--color-text-muted)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
            Members-only room
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Upgrade your plan to access {room.name}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/communities/${slug}/subscribe`)}
          className="inline-flex h-9 items-center gap-1 px-4 text-[13px] font-medium text-white"
          style={{
            background: "var(--color-accent)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          See plans <ArrowRight size={13} />
        </button>
      </div>
    );
  }

  const common = {
    roomId: room.id,
    roomName: room.name,
    communityId,
    slug,
    hideHeader: true as const,
  };

  const roomInner = (() => {
    switch (room.room_type) {
      case "posts": return <PostsRoom {...common} />;
      case "chat": return <ChatRoom {...common} />;
      case "course": return <CourseRoom {...common} />;
      case "tasks": return <TasksRoom {...common} />;
      case "resources": return <ResourcesRoom {...common} />;
      default:
        return (
          <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-[var(--color-text-muted)]">
            Unsupported room type: {room.room_type}
          </div>
        );
    }
  })();

  return (
    <WorkspaceRoomOverlay
      communityName={communityName}
      spaceName={space.name}
      spaceIconName={space.icon}
      roomName={room.name}
      roomType={room.room_type}
      onClose={closeRoomOverlay}
    >
      {roomInner}
    </WorkspaceRoomOverlay>
  );
}