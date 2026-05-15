// import { cn } from "@/lib/utils";
// import { SidebarMember, InboxConversation, SidebarFilter } from "@/types";
// import { MoreHorizontal, Search } from "lucide-react";

// interface ChatRoom {
//   id: string;
//   name: string;
//   spaceId: string;
// }

// interface ChatSidebarProps {
//   roomId: string;
//   activeConvId: string | null;
//   isChatting: boolean;
//   allChatRooms: ChatRoom[];
//   sidebarMembers: SidebarMember[];
//   inboxConversations: InboxConversation[];
//   unreadCounts: Record<string, number>;
//   sidebarFilter: SidebarFilter;
//   userId: string | null;
//   setSidebarFilter: (f: SidebarFilter) => void;
//   onSelectRoom: (spaceId: string, roomId: string) => void;
//   onSelectConv: (conv: InboxConversation) => void;
//   onOpenDm: (member: SidebarMember) => void;
// }

// export function ChatSidebar({
//   roomId,
//   activeConvId,
//   isChatting,
//   allChatRooms,
//   sidebarMembers,
//   inboxConversations,
//   unreadCounts,
//   sidebarFilter,
//   userId,
//   setSidebarFilter,
//   onSelectRoom,
//   onSelectConv,
//   onOpenDm,
// }: ChatSidebarProps) {
//   return (
//     <div
//       className={cn(
//         "w-[360px] shrink-0 flex-col bg-white border-r border-[#d1d7db]",
//         isChatting ? "hidden md:flex" : "flex"
//       )}
//     >
//       {/* Header */}
//       <div className="flex items-center justify-between px-4 py-[10px] bg-[#f0f2f5] min-h-[59px]">
//         <span className="font-bold text-[19px] text-[#111b21]">Chats</span>
//         <button
//           aria-label="More options"
//           className="h-8 w-8 flex items-center justify-center rounded-sm text-[#667781]"
//         >
//           <MoreHorizontal size={18} />
//         </button>
//       </div>

//       {/* Search */}
//       <div
//         className="px-3 py-2 bg-white border-b border-[#d1d7db] cursor-pointer"
//         onClick={() => setSidebarFilter("inbox")}
//       >
//         <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-lg px-3 py-2 hover:bg-[#ebebeb] transition-colors">
//           <Search className="h-4 w-4 shrink-0 text-[#667781]" />
//           <span className="flex-1 text-sm text-[#667781]">Search or browse members</span>
//         </div>
//       </div>

//       {/* Filter bar */}
//       <div className="flex gap-1.5 px-3 py-2 bg-white border-b border-[#d1d7db] overflow-x-auto scrollbar-hide">
//         {(["all", "unread", "group", "inbox", "calls"] as SidebarFilter[]).map((f) => (
//           <button
//             key={f}
//             className={cn(
//               "px-3.5 py-[5px] rounded-full text-[13px] font-medium whitespace-nowrap transition-all",
//               sidebarFilter === f
//                 ? "bg-[#d9fdd3] text-[#008069] font-semibold"
//                 : "bg-[#f0f2f5] text-[#667781]"
//             )}
//             onClick={() => setSidebarFilter(f)}
//           >
//             {f.charAt(0).toUpperCase() + f.slice(1)}
//           </button>
//         ))}
//       </div>

//       {/* List */}
//       <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#d1d7db]">
//         {/* Rooms */}
//         {(sidebarFilter === "all" || sidebarFilter === "group" || sidebarFilter === "unread") &&
//           allChatRooms.map((r) => {
//             const ur = unreadCounts[r.id] || 0;
//             if (sidebarFilter === "unread" && ur === 0) return null;
//             return (
//               <div
//                 key={r.id}
//                 className={cn(
//                   "flex items-center gap-3 px-4 py-[10px] cursor-pointer border-b border-[#d1d7db] transition-colors min-h-[72px]",
//                   r.id === roomId && !activeConvId ? "bg-[#ebebeb]" : "hover:bg-[#f5f6f6]"
//                 )}
//                 onClick={() => onSelectRoom(r.spaceId, r.id)}
//               >
//                 <div className="h-[49px] w-[49px] rounded-full flex items-center justify-center font-bold text-[18px] shrink-0 bg-[#dfe5e7] text-[#3b4a54] uppercase overflow-hidden">
//                   {r.name.slice(0, 2)}
//                 </div>
//                 <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
//                   <div className="flex items-center justify-between gap-1.5">
//                     <span className="font-medium text-[15px] text-[#111b21] truncate flex-1">
//                       #{r.name}
//                     </span>
//                     {ur > 0 && (
//                       <span className="bg-[#00a884] text-white rounded-full text-[11px] font-bold px-1.5 py-px shrink-0">
//                         {ur}
//                       </span>
//                     )}
//                   </div>
//                   <div className="text-[13px] text-[#667781] truncate">Community channel</div>
//                 </div>
//               </div>
//             );
//           })}

//         {/* DM conversations */}
//         {(sidebarFilter === "all" || sidebarFilter === "unread") &&
//           inboxConversations.map((conv) => {
//             const ur = unreadCounts[conv.id] || 0;
//             if (sidebarFilter === "unread" && ur === 0) return null;
//             return (
//               <div
//                 key={conv.id}
//                 className={cn(
//                   "flex items-center gap-3 px-4 py-[10px] cursor-pointer border-b border-[#d1d7db] transition-colors min-h-[72px]",
//                   activeConvId === conv.id ? "bg-[#ebebeb]" : "hover:bg-[#f5f6f6]"
//                 )}
//                 onClick={() => onSelectConv(conv)}
//               >
//                 <div className="h-[49px] w-[49px] rounded-full shrink-0 overflow-hidden bg-[#dfe5e7] flex items-center justify-center font-bold text-[18px] text-[#3b4a54]">
//                   {conv.peerAvatar ? (
//                     <img src={conv.peerAvatar} className="w-full h-full object-cover" alt="" />
//                   ) : (
//                     <span>{conv.peerName[0]}</span>
//                   )}
//                 </div>
//                 <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
//                   <div className="flex items-center justify-between gap-1.5">
//                     <span className="font-medium text-[15px] text-[#111b21] truncate flex-1">
//                       {conv.peerName}
//                     </span>
//                     {ur > 0 && (
//                       <span className="bg-[#00a884] text-white rounded-full text-[11px] font-bold px-1.5 py-px shrink-0">
//                         {ur}
//                       </span>
//                     )}
//                   </div>
//                   <div className="text-[13px] text-[#667781] truncate">Private message</div>
//                 </div>
//               </div>
//             );
//           })}

//         {/* Member directory */}
//         {sidebarFilter === "inbox" &&
//           (sidebarMembers.length === 0 ? (
//             <p className="px-4 py-6 text-center text-[13px] text-[#667781]">No members found.</p>
//           ) : (
//             sidebarMembers.map((m) => {
//               const name = m.profile?.full_name || m.profile?.username || "Member";
//               const av = m.profile?.avatar_url;
//               const isMe = m.user_id === userId;
//               return (
//                 <div
//                   key={m.user_id}
//                   className={cn(
//                     "flex items-center gap-3 px-4 py-[10px] border-b border-[#d1d7db] min-h-[72px] transition-colors",
//                     isMe ? "cursor-default opacity-70" : "cursor-pointer hover:bg-[#f5f6f6]"
//                   )}
//                   onClick={() => onOpenDm(m)}
//                 >
//                   <div className="h-[49px] w-[49px] rounded-full shrink-0 overflow-hidden bg-[#dfe5e7] flex items-center justify-center font-bold text-[18px] text-[#3b4a54] uppercase">
//                     {av ? (
//                       <img src={av} className="w-full h-full object-cover" alt="" />
//                     ) : (
//                       <span>{name[0]?.toUpperCase()}</span>
//                     )}
//                   </div>
//                   <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
//                     <div className="flex items-center justify-between gap-1.5">
//                       <span className="font-medium text-[15px] text-[#111b21] truncate flex-1">
//                         {name}
//                       </span>
//                       {m.role === "owner" && (
//                         <span className="text-[10px] font-bold text-[#00a884]">Owner</span>
//                       )}
//                       {m.role === "admin" && (
//                         <span className="text-[10px] font-bold text-orange-400">Admin</span>
//                       )}
//                     </div>
//                     <div className="text-[13px] text-[#667781] truncate">
//                       {isMe ? "You" : "Tap to message"}
//                     </div>
//                   </div>
//                 </div>
//               );
//             })
//           ))}
//       </div>
//     </div>
//   );
// }
import { cn } from "@/lib/utils";
import { SidebarMember, InboxConversation, SidebarFilter } from "@/types";
import { MoreHorizontal, Search } from "lucide-react";

// All colours come from your existing globals.css --color-* tokens.
//
// Token               Light value      Dark value
// --color-bg          #ffffff          #0a0a0a
// --color-surface     #ffffff          #111111
// --color-surface-secondary #f9f9f9   #1a1a1a
// --color-border      #e8e8e8          #222222
// --color-border-strong #d0d0d0        #333333
// --color-text-primary  #11181c        #ededed
// --color-text-secondary #3c4248       #a8a8a8
// --color-text-muted   #889096         #6a6a6a
// --color-accent       #fd5000         #fd5000
// --color-success      #30a46c         (unchanged)
//
// Semantic mapping used in this component:
//   Panel bg          → --color-surface
//   Header / hover    → --color-surface-secondary
//   Active item       → --color-border  (subtle tint, same trick WhatsApp uses)
//   Borders           → --color-border
//   Avatar bg         → --color-border-strong
//   Primary text      → --color-text-primary
//   Secondary text    → --color-text-secondary
//   Placeholder text  → --color-text-muted
//   Badge / accent    → --color-accent
//   Owner badge       → --color-success
//   Filter pill active bg → --color-accent-light  (#fff3ee / #200d00)
//   Filter pill active text → --color-accent

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
        "w-[360px] shrink-0 flex-col",
        "bg-[var(--color-surface)] border-r border-[var(--color-border)]",
        isChatting ? "hidden md:flex" : "flex"
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-[10px] min-h-[59px]",
          "bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]"
        )}
      >
        <span className="font-bold text-[19px] text-[var(--color-text-primary)]">
          Chats
        </span>
        <button
          aria-label="More options"
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-md",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-border)] transition-colors"
          )}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          "px-3 py-2 border-b border-[var(--color-border)] cursor-pointer",
          "bg-[var(--color-surface)]"
        )}
        onClick={() => setSidebarFilter("inbox")}
      >
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-[9px] transition-colors",
            "bg-[var(--color-surface-secondary)] hover:bg-[var(--color-border)]"
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <span className="flex-1 text-sm text-[var(--color-text-muted)]">
            Search or browse members
          </span>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex gap-1.5 px-3 py-2 border-b border-[var(--color-border)] overflow-x-auto no-scrollbar",
          "bg-[var(--color-surface)]"
        )}
      >
        {(["all", "unread", "group", "inbox", "calls"] as SidebarFilter[]).map(
          (f) => (
            <button
              key={f}
              className={cn(
                "px-3.5 py-[5px] rounded-full text-[13px] font-medium whitespace-nowrap transition-all",
                sidebarFilter === f
                  ? "bg-[var(--color-accent-light)] text-[var(--color-accent)] font-semibold"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
              )}
              onClick={() => setSidebarFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          )
        )}
      </div>

      {/* ── List ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">

        {/* ── Rooms ─────────────────────────────────────────────────── */}
        {(sidebarFilter === "all" ||
          sidebarFilter === "group" ||
          sidebarFilter === "unread") &&
          allChatRooms.map((r) => {
            const ur = unreadCounts[r.id] || 0;
            if (sidebarFilter === "unread" && ur === 0) return null;
            const isActive = r.id === roomId && !activeConvId;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-[10px] cursor-pointer min-h-[72px]",
                  "border-b border-[var(--color-border)] transition-colors",
                  isActive
                    ? "bg-[var(--color-border)]"
                    : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]"
                )}
                onClick={() => onSelectRoom(r.spaceId, r.id)}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "h-[49px] w-[49px] rounded-full shrink-0 overflow-hidden",
                    "flex items-center justify-center font-bold text-[18px] uppercase",
                    "bg-[var(--color-border-strong)] text-[var(--color-text-secondary)]"
                  )}
                >
                  {r.name.slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-medium text-[15px] text-[var(--color-text-primary)] truncate flex-1">
                      #{r.name}
                    </span>
                    {ur > 0 && (
                      <span className="bg-[var(--color-accent)] text-white rounded-full text-[11px] font-bold px-1.5 py-px shrink-0">
                        {ur}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-[var(--color-text-muted)] truncate">
                    Community channel
                  </div>
                </div>
              </div>
            );
          })}

        {/* ── DM conversations ──────────────────────────────────────── */}
        {(sidebarFilter === "all" || sidebarFilter === "unread") &&
          inboxConversations.map((conv) => {
            const ur = unreadCounts[conv.id] || 0;
            if (sidebarFilter === "unread" && ur === 0) return null;
            const isActive = activeConvId === conv.id;
            return (
              <div
                key={conv.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-[10px] cursor-pointer min-h-[72px]",
                  "border-b border-[var(--color-border)] transition-colors",
                  isActive
                    ? "bg-[var(--color-border)]"
                    : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]"
                )}
                onClick={() => onSelectConv(conv)}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "h-[49px] w-[49px] rounded-full shrink-0 overflow-hidden",
                    "flex items-center justify-center font-bold text-[18px]",
                    "bg-[var(--color-border-strong)] text-[var(--color-text-secondary)]"
                  )}
                >
                  {conv.peerAvatar ? (
                    <img
                      src={conv.peerAvatar}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <span>{conv.peerName[0]}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-medium text-[15px] text-[var(--color-text-primary)] truncate flex-1">
                      {conv.peerName}
                    </span>
                    {ur > 0 && (
                      <span className="bg-[var(--color-accent)] text-white rounded-full text-[11px] font-bold px-1.5 py-px shrink-0">
                        {ur}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-[var(--color-text-muted)] truncate">
                    Private message
                  </div>
                </div>
              </div>
            );
          })}

        {/* ── Member directory ──────────────────────────────────────── */}
        {sidebarFilter === "inbox" &&
          (sidebarMembers.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-[var(--color-text-muted)]">
              No members found.
            </p>
          ) : (
            sidebarMembers.map((m) => {
              const name =
                m.profile?.full_name || m.profile?.username || "Member";
              const av = m.profile?.avatar_url;
              const isMe = m.user_id === userId;
              return (
                <div
                  key={m.user_id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-[10px] min-h-[72px]",
                    "border-b border-[var(--color-border)] transition-colors",
                    isMe
                      ? "cursor-default opacity-50 bg-[var(--color-surface)]"
                      : "cursor-pointer bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]"
                  )}
                  onClick={() => !isMe && onOpenDm(m)}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "h-[49px] w-[49px] rounded-full shrink-0 overflow-hidden uppercase",
                      "flex items-center justify-center font-bold text-[18px]",
                      "bg-[var(--color-border-strong)] text-[var(--color-text-secondary)]"
                    )}
                  >
                    {av ? (
                      <img
                        src={av}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <span>{name[0]?.toUpperCase()}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-medium text-[15px] text-[var(--color-text-primary)] truncate flex-1">
                        {name}
                      </span>
                      {m.role === "owner" && (
                        <span className="text-[10px] font-bold text-[var(--color-success)]">
                          Owner
                        </span>
                      )}
                      {m.role === "admin" && (
                        <span className="text-[10px] font-bold text-[var(--color-accent)]">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-[var(--color-text-muted)] truncate">
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