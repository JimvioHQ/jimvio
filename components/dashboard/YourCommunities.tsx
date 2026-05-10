// import type { Community } from "@/types/dashboard";

// export function YourCommunities({ communities }: { communities: Community[] }) {
//   return (
//     <div className="bg-surface border border-border rounded-2xl p-4">
//       <div className="flex items-center justify-between mb-4">
//         <span className="text-[13px] font-bold text-text-primary">Your Communities</span>
//         <a href="/dashboard/communities" className="text-[12px] text-[#fd5000] font-medium hover:underline">View all</a>
//       </div>
//       <div className="flex flex-col gap-3.5">
//         {communities.length === 0 ? (
//           <p className="text-[12px] text-text-muted text-center py-4">No communities yet</p>
//         ) : communities.map((c, i) => (
//           <div key={i} className="flex gap-2.5 items-center cursor-pointer group">
//             {c.avatarUrl && c.avatarUrl.trim() ? (
//               <img
//                 src={c.avatarUrl}
//                 alt={c.name}
//                 className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-border"
//               />  
//             ) : (
//               <div
//                 className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
//                 style={{ background: c.color }}
//               >
//                 {c.initial}
//               </div>
//             )}
//             <div className="flex-1 min-w-0">
//               <p className="text-[12px] font-semibold text-text-primary truncate">{c.name}</p>
//               <p className="text-[11px] text-text-muted">
//                 {c.members} members{c.online ? ` · ${c.online}` : ""}
//               </p>
//               {c.lastMessage && (
//                 <p className="text-[11px] text-text-secondary truncate mt-0.5">{c.lastMessage}</p>
//               )}
//             </div>
//             <div className="flex flex-col items-end gap-1 flex-shrink-0">
//               {c.time && <span className="text-[10px] text-text-muted">{c.time}</span>}
//               {c.unread > 0 && (
//                 <span className="w-4 h-4 rounded-full bg-[#fd5000] text-white text-[9px] font-bold flex items-center justify-center">
//                   {c.unread}
//                 </span>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

import type { Community } from "@/types/dashboard";
import { Users, ChevronRight } from "lucide-react";
import Link from "next/link";

export function YourCommunities({ communities }: { communities: Community[] }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#fd5000]/10 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-[#fd5000]" />
          </div>
          <span className="text-[13px] font-bold text-text-primary">Your Communities</span>
          {communities.length > 0 && (
            <span className="text-[10px] font-semibold text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded-full">
              {communities.length}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/communities"
          className="text-[12px] text-[#fd5000] font-medium hover:underline flex items-center gap-0.5 group/link"
        >
          View all
          <ChevronRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>

      {/* List */}
      <div className="flex flex-col gap-1">
        {communities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-text-muted" />
            </div>
            <p className="text-[12px] font-semibold text-text-primary mb-1">No communities yet</p>
            <p className="text-[11px] text-text-muted text-center mb-3">
              Join one to start connecting with creators
            </p>

            <Link href="/dashboard/communities"
              className="text-[11px] font-semibold text-[#fd5000] hover:underline"
            >
              Explore communities →
            </Link>
          </div>
        ) : (
          communities.map((c, i) => (
            <Link
              href="#"
              key={i}
              className="flex gap-3 items-center cursor-pointer group p-2 -mx-2 rounded-sm hover:bg-surface-secondary transition-all duration-200"
            >
              {/* Avatar with online indicator */}
              <div className="relative flex-shrink-0">
                {c.avatarUrl && c.avatarUrl.trim() ? (
                  <img
                    src={c.avatarUrl}
                    alt={c.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-border group-hover:ring-[#fd5000]/30 transition-all duration-200"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-border group-hover:ring-[#fd5000]/30 transition-all duration-200 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)` }}
                  >
                    {c.initial}
                  </div>
                )}
                {c.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#30a46c] border-2 border-surface" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] font-semibold text-text-primary truncate group-hover:text-[#fd5000] transition-colors duration-200">
                    {c.name}
                  </p>
                </div>
                <p className="text-[11px] text-text-muted flex items-center gap-1">
                  <span>{c.members} members</span>
                  {c.online && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-text-muted" />
                      <span className="text-[#30a46c] font-medium">{c.online} online</span>
                    </>
                  )}
                </p>
                {c.lastMessage && (
                  <p className="text-[11px] text-text-secondary truncate mt-0.5 leading-snug">
                    {c.lastMessage}
                  </p>
                )}
              </div>

              {/* Trailing meta */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {c.time && (
                  <span className="text-[10px] text-text-muted font-medium">{c.time}</span>
                )}
                {c.unread > 0 ? (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#fd5000] text-white text-[10px] font-bold flex items-center justify-center shadow-sm shadow-[#fd5000]/30">
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}