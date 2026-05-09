// "use client";

// import React, { useState } from "react";
// import Image from "next/image";
// import { Menu, X } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { WorkspaceProvider, type WorkspaceContextValue } from "@/components/community/workspace-context";
// import { WorkspaceSidebar } from "@/components/community/WorkspaceSidebar";
// import { CallProvider } from "@/components/community/call-context";
// import type { MembershipLite } from "@/lib/community-workspace-access";


// type ShellProps = {
//   slug: string;
//   community: {
//     id: string;
//     name: string;
//     slug: string;
//     avatar_url: string | null;
//     member_count: number | null;
//     owner_id: string;
//   };
//   membership: MembershipLite | null;
//   userId: string;
//   profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
//   points: { total_points: number; level: number } | null;
//   spacesWithRooms: WorkspaceContextValue["spacesWithRooms"];
//   children: React.ReactNode;
// };

// export function WorkspaceShell({
//   slug,
//   community,
//   membership,
//   userId,
//   profile,
//   points,
//   spacesWithRooms,
//   children,
// }: ShellProps) {
//   const [mobileOpen, setMobileOpen] = useState(false);

//   const ctx: WorkspaceContextValue = {
//     slug,
//     communityId: community.id,
//     communityName: community.name,
//     ownerId: community.owner_id,
//     memberCount: community.member_count ?? 0,
//     avatarUrl: community.avatar_url,
//     userId,
//     profile,
//     membership,
//     spacesWithRooms,
//     points: points ?? null,
//   };

//   const pts = points?.total_points ?? 0;
//   const lvl = points?.level ?? 1;

//   return (
//     <WorkspaceProvider value={ctx}>
//       <CallProvider>
//         <div className="relative flex w-full min-h-[calc(100vh-var(--navbar-height))] bg-[var(--color-bg)]">

//         {mobileOpen && (
//           <button
//             type="button"
//             className="fixed inset-0 z-30 bg-black/40 lg:hidden"
//             style={{ top: "var(--navbar-height)" }}
//             aria-label="Close menu"
//             onClick={() => setMobileOpen(false)}
//           />
//         )}

//         <WorkspaceSidebar
//           slug={slug}
//           communityName={community.name}
//           avatarUrl={community.avatar_url}
//           memberCount={community.member_count ?? 0}
//           ownerId={community.owner_id}
//           userId={userId}
//           membership={membership}
//           profile={profile}
//           points={points}
//           spaces={spacesWithRooms}
//           mobileOpen={mobileOpen}
//           onNavigate={() => setMobileOpen(false)}
//         />

//         <div className="flex flex-1 flex-col min-w-0 lg:ml-0">
//           <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 lg:hidden">
//             <Button
//               type="button"
//               variant="ghost"
//               size="icon"
//               className="rounded-sm"
//               onClick={() => setMobileOpen((o) => !o)}
//               aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
//             >
//               {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
//             </Button>
//             <span className="text-sm font-black text-[var(--color-text-primary)] truncate">{community.name}</span>
//           </div>

//           <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>

//           <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 flex items-center gap-2 lg:hidden">
//             <div className="h-8 w-8 rounded-sm overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shrink-0">
//               {profile?.avatar_url ? (
//                 <Image src={profile.avatar_url} alt="" width={32} height={32} className="object-cover h-full w-full" unoptimized />
//               ) : (
//                 <div className="h-full w-full flex items-center justify-center text-xs font-black text-[var(--color-accent)]">
//                   {(profile?.full_name || profile?.username || "?")[0]}
//                 </div>
//               )}
//             </div>
//             <div className="min-w-0 flex-1">
//               <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
//                 {profile?.full_name || profile?.username || "Member"}
//               </p>
//               <p className="text-[10px] font-black text-[var(--color-accent)]">
//                 {pts.toLocaleString()} pts · Lvl {lvl}
//               </p>
//             </div>
//           </div>
//         </div>
//         </div>
//       </CallProvider>
//     </WorkspaceProvider>
//   );
// }

// components/community/workspace-shell.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Bell, Search, Home, Trophy, Users, Briefcase, User } from "lucide-react";
import {
  WorkspaceProvider,
  type WorkspaceContextValue,
  type LiveSessionLite,
  type PointsSnapshot,
} from "@/components/community/workspace-context";
import { WorkspaceSidebar } from "@/components/community/WorkspaceSidebar";
import { CallProvider } from "@/components/community/call-context";
import { cn } from "@/lib/utils";
import type { MembershipLite } from "@/lib/community-workspace-access";

type ShellProps = {
  slug: string;
  community: {
    id: string;
    name: string;
    slug: string;
    avatar_url: string | null;
    member_count: number | null;
    owner_id: string;
  };
  membership: MembershipLite | null;
  userId: string;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points: PointsSnapshot | null;
  spacesWithRooms: WorkspaceContextValue["spacesWithRooms"];
  liveSessions: LiveSessionLite[];
  unreadNotifications: number;
  openMissionsCount: number;
  children: React.ReactNode;
};

export function WorkspaceShell({
  slug,
  community,
  membership,
  userId,
  profile,
  points,
  spacesWithRooms,
  liveSessions,
  unreadNotifications,
  openMissionsCount,
  children,
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const ctx: WorkspaceContextValue = {
    slug,
    communityId: community.id,
    communityName: community.name,
    ownerId: community.owner_id,
    memberCount: community.member_count ?? 0,
    avatarUrl: community.avatar_url,
    userId,
    profile,
    membership,
    spacesWithRooms,
    points,
    liveSessions,
    unreadNotifications,
    openMissionsCount,
  };

  const base = `/communities/${slug}/workspace`;

  return (
    <WorkspaceProvider value={ctx}>
      <CallProvider>
        <div
          className="relative flex w-full bg-[var(--color-bg)]"
          style={{ minHeight: "calc(100vh - var(--navbar-height))" }}
        >
          {/* Mobile sidebar overlay */}
          {mobileOpen && (
            <button
              type="button"
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
              style={{ top: "var(--navbar-height)" }}
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <WorkspaceSidebar
            slug={slug}
            communityName={community.name}
            avatarUrl={community.avatar_url}
            memberCount={community.member_count ?? 0}
            ownerId={community.owner_id}
            userId={userId}
            membership={membership}
            profile={profile}
            points={points}
            spaces={spacesWithRooms}
            liveSessions={liveSessions}
            openMissionsCount={openMissionsCount}
            mobileOpen={mobileOpen}
            onNavigate={() => setMobileOpen(false)}
          />

          <div className="flex flex-1 flex-col min-w-0">
            {/* ── Mobile top bar ─────────────────────────────────────── */}
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              <span className="flex-1 truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                {community.name}
              </span>

              <Link
                href={`${base}/notifications`}
                className="relative flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                )}
              </Link>
            </div>

            {/* ── Main content ───────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden pb-14 lg:pb-0">
              {children}
            </div>

            {/* ── Mobile bottom nav (5 tabs per blueprint §13) ───────── */}
            <MobileBottomNav
              base={base}
              pathname={pathname}
              unreadNotifications={unreadNotifications}
              openMissionsCount={openMissionsCount}
              liveCount={liveSessions.length}
              profile={profile}
            />
          </div>
        </div>
      </CallProvider>
    </WorkspaceProvider>
  );
}

/* ─── Mobile bottom nav ──────────────────────────────────────────── */

function MobileBottomNav({
  base,
  pathname,
  unreadNotifications,
  openMissionsCount,
  liveCount,
  profile,
}: {
  base: string;
  pathname: string;
  unreadNotifications: number;
  openMissionsCount: number;
  liveCount: number;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
}) {
  const items = [
    { href: base, label: "Home", icon: Home, badge: 0, exact: true },
    { href: `${base}/missions`, label: "Missions", icon: Briefcase, badge: openMissionsCount, exact: false },
    { href: `${base}/live`, label: "Live", icon: null, badge: liveCount, exact: false, isLive: true },
    { href: `${base}/members`, label: "Members", icon: Users, badge: 0, exact: false },
    { href: `${base}/profile`, label: "You", icon: User, badge: 0, exact: false, isProfile: true },
  ];

  return (
    <nav
      className="safe-area-pb fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md lg:hidden"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
            )}
          >
            {/* Live tab gets a custom pulsing icon */}
            {item.isLive ? (
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span
                  className={cn(
                    "absolute h-2 w-2 rounded-full",
                    item.badge > 0
                      ? "bg-[var(--color-danger)] animate-ping opacity-75"
                      : "bg-[var(--color-text-muted)] opacity-30"
                  )}
                />
                <span
                  className={cn(
                    "relative h-2 w-2 rounded-full",
                    item.badge > 0 ? "bg-[var(--color-danger)]" : "bg-[var(--color-text-muted)]"
                  )}
                />
              </span>
            ) : item.isProfile && profile?.avatar_url ? (
              <span className="relative h-5 w-5 overflow-hidden rounded-full">
                <Image src={profile.avatar_url} alt="" fill sizes="20px" className="object-cover" unoptimized />
                {active && (
                  <span className="absolute inset-0 rounded-full ring-2 ring-[var(--color-accent)]" />
                )}
              </span>
            ) : item.icon ? (
              <item.icon className={cn("h-4 w-4", active && "scale-110")} />
            ) : null}

            <span>{item.label}</span>

            {item.badge > 0 && (
              <span className="absolute right-[20%] top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-semibold text-white">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}