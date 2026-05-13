import { cn } from "@/lib/utils";
import { SidebarMember, InboxConversation, SidebarFilter } from "@/types";
import { MoreHorizontal, Search } from "lucide-react";

interface ChatRoom {
  id: string;
  name: string;
  spaceId: string;
}

interface ChatSidebarProps {
  roomId: string;
  activeConvId: string | null;
  isChatting: boolean;
  allChatRooms: ChatRoom[];
  sidebarMembers: SidebarMember[];
  inboxConversations: InboxConversation[];
  unreadCounts: Record<string, number>;
  sidebarFilter: SidebarFilter;
  userId: string | null;
  setSidebarFilter: (f: SidebarFilter) => void;
  onSelectRoom: (spaceId: string, roomId: string) => void;
  onSelectConv: (conv: InboxConversation) => void;
  onOpenDm: (member: SidebarMember) => void;
}

export function ChatSidebar({
  roomId,
  activeConvId,
  isChatting,
  allChatRooms,
  sidebarMembers,
  inboxConversations,
  unreadCounts,
  sidebarFilter,
  userId,
  setSidebarFilter,
  onSelectRoom,
  onSelectConv,
  onOpenDm,
}: ChatSidebarProps) {
  return (
    <div
      className={cn(
        "w-[360px] shrink-0 flex-col bg-white border-r border-[#d1d7db]",
        isChatting ? "hidden md:flex" : "flex"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-[10px] bg-[#f0f2f5] min-h-[59px]">
        <span className="font-bold text-[19px] text-[#111b21]">Chats</span>
        <button
          aria-label="More options"
          className="h-8 w-8 flex items-center justify-center rounded-sm text-[#667781]"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Search */}
      <div
        className="px-3 py-2 bg-white border-b border-[#d1d7db] cursor-pointer"
        onClick={() => setSidebarFilter("inbox")}
      >
        <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-lg px-3 py-2 hover:bg-[#ebebeb] transition-colors">
          <Search className="h-4 w-4 shrink-0 text-[#667781]" />
          <span className="flex-1 text-sm text-[#667781]">Search or browse members</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1.5 px-3 py-2 bg-white border-b border-[#d1d7db] overflow-x-auto scrollbar-hide">
        {(["all", "unread", "group", "inbox", "calls"] as SidebarFilter[]).map((f) => (
          <button
            key={f}
            className={cn(
              "px-3.5 py-[5px] rounded-full text-[13px] font-medium whitespace-nowrap transition-all",
              sidebarFilter === f
                ? "bg-[#d9fdd3] text-[#008069] font-semibold"
                : "bg-[#f0f2f5] text-[#667781]"
            )}
            onClick={() => setSidebarFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#d1d7db]">
        {/* Rooms */}
        {(sidebarFilter === "all" || sidebarFilter === "group" || sidebarFilter === "unread") &&
          allChatRooms.map((r) => {
            const ur = unreadCounts[r.id] || 0;
            if (sidebarFilter === "unread" && ur === 0) return null;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-[10px] cursor-pointer border-b border-[#d1d7db] transition-colors min-h-[72px]",
                  r.id === roomId && !activeConvId ? "bg-[#ebebeb]" : "hover:bg-[#f5f6f6]"
                )}
                onClick={() => onSelectRoom(r.spaceId, r.id)}
              >
                <div className="h-[49px] w-[49px] rounded-full flex items-center justify-center font-bold text-[18px] shrink-0 bg-[#dfe5e7] text-[#3b4a54] uppercase overflow-hidden">
                  {r.name.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-medium text-[15px] text-[#111b21] truncate flex-1">
                      #{r.name}
                    </span>
                    {ur > 0 && (
                      <span className="bg-[#00a884] text-white rounded-full text-[11px] font-bold px-1.5 py-px shrink-0">
                        {ur}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-[#667781] truncate">Community channel</div>
                </div>
              </div>
            );
          })}

        {/* DM conversations */}
        {(sidebarFilter === "all" || sidebarFilter === "unread") &&
          inboxConversations.map((conv) => {
            const ur = unreadCounts[conv.id] || 0;
            if (sidebarFilter === "unread" && ur === 0) return null;
            return (
              <div
                key={conv.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-[10px] cursor-pointer border-b border-[#d1d7db] transition-colors min-h-[72px]",
                  activeConvId === conv.id ? "bg-[#ebebeb]" : "hover:bg-[#f5f6f6]"
                )}
                onClick={() => onSelectConv(conv)}
              >
                <div className="h-[49px] w-[49px] rounded-full shrink-0 overflow-hidden bg-[#dfe5e7] flex items-center justify-center font-bold text-[18px] text-[#3b4a54]">
                  {conv.peerAvatar ? (
                    <img src={conv.peerAvatar} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span>{conv.peerName[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-medium text-[15px] text-[#111b21] truncate flex-1">
                      {conv.peerName}
                    </span>
                    {ur > 0 && (
                      <span className="bg-[#00a884] text-white rounded-full text-[11px] font-bold px-1.5 py-px shrink-0">
                        {ur}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-[#667781] truncate">Private message</div>
                </div>
              </div>
            );
          })}

        {/* Member directory */}
        {sidebarFilter === "inbox" &&
          (sidebarMembers.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-[#667781]">No members found.</p>
          ) : (
            sidebarMembers.map((m) => {
              const name = m.profile?.full_name || m.profile?.username || "Member";
              const av = m.profile?.avatar_url;
              const isMe = m.user_id === userId;
              return (
                <div
                  key={m.user_id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-[10px] border-b border-[#d1d7db] min-h-[72px] transition-colors",
                    isMe ? "cursor-default opacity-70" : "cursor-pointer hover:bg-[#f5f6f6]"
                  )}
                  onClick={() => onOpenDm(m)}
                >
                  <div className="h-[49px] w-[49px] rounded-full shrink-0 overflow-hidden bg-[#dfe5e7] flex items-center justify-center font-bold text-[18px] text-[#3b4a54] uppercase">
                    {av ? (
                      <img src={av} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span>{name[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-medium text-[15px] text-[#111b21] truncate flex-1">
                        {name}
                      </span>
                      {m.role === "owner" && (
                        <span className="text-[10px] font-bold text-[#00a884]">Owner</span>
                      )}
                      {m.role === "admin" && (
                        <span className="text-[10px] font-bold text-orange-400">Admin</span>
                      )}
                    </div>
                    <div className="text-[13px] text-[#667781] truncate">
                      {isMe ? "You" : "Tap to message"}
                    </div>
                  </div>
                </div>
              );
            })
          ))}
      </div>
    </div>
  );
}