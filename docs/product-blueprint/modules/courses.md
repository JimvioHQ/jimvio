# Courses

**Status:** ✅ Production · **Routes:** `/c/(hubs)/courses`, `/c/(hubs)/[slug]/courses`, `/c/(hubs)/community/[slug]/courses`

## 1. Purpose

**Structured learning** within communities — course rooms, lessons, and progress tracking. Connects education to creator monetization and community retention.

## 2. Target Users

| User | Goal |
|------|------|
| Community Owner | Monetize expertise via courses |
| Creator | Publish courses on profile |
| Student / Member | Learn and track progress |
| Buyer | Purchase course access |

## 3. Core Features

- Course rooms (`components/community/rooms/CourseRoom.tsx`)
- Course section in workspace (`course-section.tsx`)
- Lesson structure with progress (DB tables)
- Gated by community membership tier
- Linked from creator profiles (courses tab)
- Hub courses page (`/c/(hubs)/courses`)

## 4. User Journeys

**Student enrolls**
```
Community → Courses → Select course → Access lessons → Progress saved → Complete
```

**Owner creates course**
```
/c/[slug]/courses → Create → Add lessons → Publish → Members access (tier-gated)
```

**Discovery via creator**
```
Creator profile → Courses tab → Enroll in community → Start learning
```

## 5. Permissions

| Action | Guest | Member | Owner | Admin |
|--------|:-----:|:------:|:-----:|:-----:|
| Browse course list | 🟡 Public preview | ✅ | ✅ | ✅ |
| Access lessons | ❌ | Tier-dependent | ✅ | ✅ |
| Create / edit | ❌ | ❌ | ✅ | ✅ |

## 6. AI Opportunities

- Copilot: "What courses match my interests?"
- Lesson summary generation
- Quiz generation from content (future)
- Learning path recommendations

## 7. Notifications

- New course published (members)
- Lesson completed milestone
- Course completion certificate (future)

## 8. Analytics

- Enrollment count
- Completion rate
- Lesson drop-off points
- Revenue per course

## 9. KPIs

| KPI | Target |
|-----|--------|
| Course completion rate | ↑ |
| Enrollment conversion | ↑ |
| Lesson engagement time | ↑ |
| Course-related retention | ↑ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Video lesson player improvements |
| v1.2 | Quizzes and assessments |
| v1.3 | Certificates and credentials |
| v2.0 | Standalone course marketplace |

## 11. Dependencies

- Communities, Payments (tier gating), Creator Profiles
- Workspace sections
- Messaging (Q&A future)

## 12. Security Considerations

- Lesson content access server-validated by tier
- No direct URL bypass for paid lessons
- Progress tied to authenticated user

## 13. Accessibility Considerations

- Lesson navigation keyboard accessible
- Video captions support (future)
- Progress announced to screen readers
- Readable lesson typography (DS tokens)
