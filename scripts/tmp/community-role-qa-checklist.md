# Jimvio Community — Production Role QA Checklist

Reusable matrix derived from `lib/community/workspace/permissions.ts` and Community API/route guards.
Code roles: `guest` (= visitor), `member`, `moderator`, `admin`, `owner`. Platform admin is `user_roles.admin` / `ADMIN_EMAILS` — not a community membership role.

## Required credentials for full certification

| Role | Credential needed | Provisioned for cert |
|------|-------------------|----------------------|
| Visitor / guest | Anonymous browser (no login) | Always available |
| Member | Active membership (`role=member`) | `cert.member@jimvio.test` |
| Moderator | Active membership (`role=moderator`) | `cert.moderator@jimvio.test` |
| Owner | `communities.owner_id` or membership `owner`/`admin` | `LIVE_E2E_*` (owner of jimvio-community) |
| Platform admin | `user_roles.role=admin` or allowlisted admin email | Same E2E account (`/admin` reachable) |

If any of member / moderator / platform_admin accounts are missing, stop and provision them — do not invent results.

## Capability matrix (workspace engine)

| Action | Visitor | Member | Moderator | Owner/Admin | Platform admin |
|--------|---------|--------|-----------|-------------|----------------|
| Public hub browse / leaderboard | Allow | Allow | Allow | Allow | Allow |
| Auth-gated hub tools (messages, wallet…) | Deny → login | Allow | Allow | Allow | Allow |
| Enter community workspace (chat/about/courses) | Deny | Allow (active) | Allow | Allow | N/A |
| Post / comment / react / bookmark | Deny | Allow | Allow | Allow | N/A |
| Pin / moderate content | Deny | Deny | Allow | Allow | N/A |
| Invite members (share + join) | Deny | Deny* | Allow* | Allow | N/A |
| Manage channels/groups APIs | Deny | Deny | Deny | Allow | N/A |
| Owner console settings / roles / audit | Deny | Deny | Deny (nav) | Allow | N/A |
| Suspend member | Deny | Deny | Allow* | Allow | N/A |
| Change role (`change_role`) | Deny | Deny | Deny | Allow | N/A |
| Remove member | Deny | Deny | Deny | Allow | N/A |
| Platform maintenance /admin | Deny | Deny | Deny | Deny | Allow |

\* Moderators cannot suspend owners/admins. Invite capability is permission-engine `members.invite`; join path is `POST /api/communities/[slug]/join`.

## CRUD smoke (verified against production jimvio-community)

- [x] Posts — create via `/api/posts/feed` (+ `/api/posts/all` resolves default room)
- [x] Comments — `/api/posts/[id]/comments`
- [x] Reactions / likes — `/api/posts/[id]/like`
- [x] Bookmarks — `community_saved_posts` via `togglePostBookmark` / PostsRoom (client)
- [x] Groups — owner `GET/POST /api/c/owner/groups`
- [x] Channels — owner `GET/POST /api/c/owner/channels` (`communityId` + `groupId`)
- [x] Rooms — member read `/api/rooms/[spaceId]`; create owner-only
- [x] Events — hub read `/api/c/events` (tasks + campaigns projection)
- [x] Courses — hub read `/api/c/courses`; `/api/courses/[roomId]`
- [x] Invitations — join idempotent `POST /api/communities/[slug]/join`; owner console members invite shell
- [x] Roles — `PATCH .../community-memberships` `change_role` (owner/admin)
- [x] Moderation — suspend / unsuspend / remove via memberships API + CreatorModerationClient

## Realtime smoke (member+)

- [x] Chat messages appear without refresh (Supabase realtime websocket on `/chat`)
- [ ] Presence online list updates (UI still “coming soon” in members client — not a regression)
- [x] Feed INSERT/UPDATE/DELETE sync (`Feed.tsx` channel)
- [x] Message create API 200

## Creator OS

- [x] Overview at `/communities/[slug]` loads with Creator OS visible (no soft boundary)
- [x] Soft-nav remount stays healthy (no React #185; #418 gated via `useClientReady`)
- [x] Intelligence strip uses `useShallow` + client-ready store gates
