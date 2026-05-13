"use client";

import { MessageCircle, FileText, BookOpen, CheckSquare, Folder, LayoutList } from "lucide-react";
import type { WorkspaceCommunity } from "@/types/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import { ChatRoom } from "../chat/ChatRoom";
import { PostsRoom } from "../rooms/PostsRoom";
import { CourseRoom } from "../rooms/CourseRoom";
import { TasksRoom } from "../rooms/TasksRoom";
import { ResourcesRoom } from "../rooms/ResourcesRoom";

type Room = WorkspaceSpaceRow["rooms"][number];

export function RoomContent({
    community,
    space,
    room,
    currentUserId,
}: {
    community: WorkspaceCommunity;
    space: WorkspaceSpaceRow;
    room: Room;
    currentUserId: string;
}) {
    switch (room.room_type) {
        case "chat":
            return <ChatRoom roomId={room.id} roomName={room.name} communityId={community.id} slug={room.slug} />;
        case "posts":
            return <PostsRoom roomId={room.id} roomName={room.name} communityId={community.id} slug={room.slug} />;
        case "course":
            return <CourseRoom roomId={room.id} roomName={room.name} communityId={community.id} slug={room.slug} />;
        case "tasks":
            return <TasksRoom roomId={room.id} roomName={room.name} communityId={community.id} slug={room.slug} />;
        case "resources":
            return <ResourcesRoom roomId={room.id} roomName={room.name} communityId={community.id} slug={room.slug} />;
        default:
            return <UnknownRoomBody roomType={room.room_type} />;
    }
}

/* ── Placeholder bodies (swap with real implementations) ───────────── */

function Placeholder({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof MessageCircle;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-1 items-center justify-center p-8">
            <div className="flex flex-col items-center text-center max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-[var(--color-accent)]" />
                </div>
                <h3 className="text-[15px] font-bold text-[var(--color-text-primary)] mb-1">{title}</h3>
                <p className="text-[12px] text-[var(--color-text-muted)]">{description}</p>
            </div>
        </div>
    );
}

function ChatRoomBody({
    community, room, currentUserId,
}: {
    community: WorkspaceCommunity;
    room: Room;
    currentUserId: string;
}) {
    return <Placeholder icon={MessageCircle} title={room.name} description="Chat UI goes here." />;
}

function PostsRoomBody({ community, room }: { community: WorkspaceCommunity; room: Room }) {
    return <Placeholder icon={FileText} title={room.name} description="Posts / discussions UI goes here." />;
}

function CourseRoomBody({ community, room }: { community: WorkspaceCommunity; room: Room }) {
    return <Placeholder icon={BookOpen} title={room.name} description="Course lessons UI goes here." />;
}

function TasksRoomBody({ community, room }: { community: WorkspaceCommunity; room: Room }) {
    return <Placeholder icon={CheckSquare} title={room.name} description="Tasks UI goes here." />;
}

function ResourcesRoomBody({ community, room }: { community: WorkspaceCommunity; room: Room }) {
    return <Placeholder icon={Folder} title={room.name} description="Resources UI goes here." />;
}

function UnknownRoomBody({ roomType }: { roomType: string }) {
    return <Placeholder icon={LayoutList} title="Unknown room type" description={`No renderer for "${roomType}".`} />;
}