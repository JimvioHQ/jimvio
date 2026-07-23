# Jimvio Community — Production Role QA Checklist

Reusable matrix derived from `lib/community/workspace/permissions.ts` and Community API/route guards.
Code roles: `guest` (= visitor), `member`, `moderator`, `admin`, `owner`. Platform admin is `user_roles.admin` / `ADMIN_EMAILS` — not a community membership role.

## Required credentials for full certification

| Role | Credential needed |
|------|-------------------|
| Visitor / guest | Anonymous browser (no login) |
| Member | Active membership (`role=member`) on test community |
| Moderator | Active membership (`role=moderator`) |
| Owner | `communities.owner_id` or membership `owner`/`admin` |
| Platform admin | `user_roles.role=admin` or allowlisted admin email |

If any of member / moderator / platform_admin accounts are missing, stop and provision them — do not invent results.

## Capability matrix (workspace engine)

| Action | Visitor | Member | Moderator | Owner/Admin | Platform admin |
|--------|---------|--------|-----------|-------------|----------------|
| Public hub browse / leaderboard | Allow | Allow | Allow | Allow | Allow |
| Auth-gated hub tools (messages, wallet…) | Deny → login | Allow | Allow | Allow | Allow |
| Enter community workspace (chat/about/courses) | Deny | Allow (active) | Allow | Allow | N/A |
| Post / comment / react / bookmark | Deny | Allow | Allow | Allow | N/A |
| Pin / moderate content | Deny | Deny | Allow | Allow | N/A |
| Invite members | Deny | Deny | Allow | Allow | N/A |
| Manage channels/groups APIs | Deny | Deny | Deny | Allow | N/A |
| Owner console settings / roles / audit | Deny | Deny | Deny (nav) | Allow | N/A |
| Suspend member | Deny | Deny | Allow* | Allow | N/A |
| Remove member | Deny | Deny | Deny | Allow | N/A |
| Platform maintenance /admin | Deny | Deny | Deny | Deny | Allow |

\* Moderators cannot suspend owners/admins.

## CRUD smoke (per role that may write)

For each entity, confirm Create / Read / Update / Delete (or soft-delete) and that unauthorized roles get 401/403:

- [ ] Posts
- [ ] Comments
- [ ] Reactions / likes
- [ ] Bookmarks
- [ ] Groups
- [ ] Channels
- [ ] Rooms
- [ ] Events
- [ ] Courses
- [ ] Invitations
- [ ] Roles
- [ ] Moderation actions

## Realtime smoke (member+)

- [ ] Chat messages appear without refresh
- [ ] Presence online list updates
- [ ] Typing indicators clear
- [ ] Feed INSERT/UPDATE/DELETE sync
- [ ] Notification badge updates (if enabled)

## Creator OS

- [ ] Overview loads with Creator OS visible (no error boundary)
- [ ] Soft-nav remount overview stays healthy (no React #185/#418)
- [ ] Intelligence strip renders without infinite updates
