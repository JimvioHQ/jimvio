# PRD Template

**Copy this file to `PRD-NNN-feature-name.md` and complete every section.**

> Governance: [JIMVIO-PRD-STANDARD-v1.0.md](./JIMVIO-PRD-STANDARD-v1.0.md)  
> Pair with: [Feature Spec FS-NNN](../feature-specs/FEATURE-SPECIFICATION-TEMPLATE.md) · [TSL-NNN](../technical-spec-library/TSL-TEMPLATE.md) (Tier 1–2)

---

## Metadata

| Field | Value |
|-------|-------|
| **PRD ID** | PRD-NNN |
| **Title** | |
| **Status** | Draft \| In Review \| Approved \| Implemented \| Deprecated |
| **Tier** | T1 \| T2 \| T3 \| T4 \| T5 |
| **Author** | |
| **Reviewers** | Product · Design · Engineering · Security · QA · Leadership |
| **Target release** | |
| **Domain owner** | Identity \| Commerce \| Payments \| Creator Economy \| AI \| Social \| Analytics \| Administration |
| **Capabilities** | L1.L2 IDs from [BCM](../business-capability-model/) (e.g. `COM.4 Checkout`) |
| **Related modules** | |
| **Paired FS** | FS-NNN (link when created) |
| **Paired TSL** | TSL-NNN (Tier 1–2 only) |
| **Related ADRs** | |
| **Product Blueprint ref** | |

---

## 1. Executive Summary

*Write last. One page maximum for leadership.*

| Field | Content |
|-------|---------|
| **Feature** | One sentence — what we are building |
| **Problem** | One sentence — why it matters |
| **Solution** | One sentence — how we solve it |
| **Business impact** | Revenue, retention, or efficiency impact |
| **Target users** | Primary persona(s) |
| **Target release** | Quarter or sprint |
| **Tier** | T1–T5 |
| **Recommendation** | Proceed / proceed with conditions / defer |

---

## 2. Problem Statement

*What user or business problem exists today? Include evidence.*

| Evidence type | Detail |
|---------------|--------|
| User feedback | Quotes, support tickets, research |
| Metrics | Current baseline and gap |
| Competitive | Market expectation if relevant |
| Internal | Operational pain, manual workarounds |

**Problem statement (1–3 paragraphs):**

---

## 3. Background

*Why now? Strategic context, prior attempts, dependencies on roadmap.*

| Context | Detail |
|---------|--------|
| Strategic fit | How this aligns with [Product Bible](../product-bible/) / North Star |
| Prior work | Previous versions, experiments, rejected approaches |
| Market timing | Seasonal, competitive, regulatory |
| Stakeholders | Who requested or benefits |

---

## 4. Goals

*Measurable outcomes. Use verbs: increase, reduce, enable, unify.*

| # | Goal | Success indicator | Timeframe |
|---|------|-------------------|-----------|
| G1 | | | |
| G2 | | | |
| G3 | | | |

---

## 5. Non-Goals

*Explicitly out of scope. Prevents scope creep during implementation.*

- 
- 
- 

*If a stakeholder asks for these later, they require a new PRD or amendment.*

---

## 6. Business Value

| Stakeholder | Value delivered |
|-------------|-----------------|
| **End users** | |
| **Creators / sellers** | |
| **Jimvio (revenue)** | |
| **Jimvio (retention)** | |
| **Operations / support** | |
| **Strategic** | Platform differentiation, moat, data asset |

---

## 7. User Personas

| Persona | Role(s) | Primary need | Frequency |
|---------|---------|--------------|-----------|
| | buyer / vendor / affiliate / influencer / community_owner / admin | | daily / weekly / occasional |

*Reference [user roles](../product-blueprint/01-user-roles.md). Name at least one primary and one secondary persona.*

---

## 8. User Stories

```
As a [persona],
I want [capability],
So that [benefit].
```

| ID | Story | Priority (P0/P1/P2) | Persona |
|----|-------|---------------------|---------|
| US-1 | | | |
| US-2 | | | |
| US-3 | | | |

*Every P0 story requires at least one acceptance criterion in §31.*

---

## 9. Functional Requirements

*What the system SHALL do. Testable. Use SHALL/MUST.*

| ID | Requirement | Priority | Story ref |
|----|-------------|----------|-----------|
| FR-1 | The system SHALL … | P0 | US-1 |
| FR-2 | | | |

**Rules:**
- One capability per requirement
- No implementation detail (no table names, no framework choices)
- Priority P0 = launch blocker; P1 = launch desired; P2 = post-launch

---

## 10. Non-Functional Requirements

*Cross-cutting quality attributes not covered in §11–15.*

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Reliability | |
| NFR-2 | Scalability | |
| NFR-3 | Maintainability | |
| NFR-4 | Compatibility | Backward compatibility, API versioning |
| NFR-5 | Observability | Logs, metrics, alerts |
| NFR-6 | Localization | i18n readiness if applicable |

*Detailed NFRs for UX, UI, a11y, performance, security are in §11–15.*

---

## 11. UX Requirements

| Requirement | Detail |
|-------------|--------|
| **Entry point** | Where user discovers and opens the feature |
| **Primary flow** | Happy path steps (numbered) |
| **Primary action** | One clear CTA per screen |
| **Progressive disclosure** | Advanced options hidden until needed |
| **Mobile** | Mobile-first; thumb-zone CTAs |
| **Desktop** | Enhancement, not separate experience |
| **Platform fit** | Connection to Super App, Copilot, Command Center, notifications |
| **No dead ends** | Next meaningful action always visible |
| **Motion** | 150–220ms, GPU-only, `prefers-reduced-motion` |

*Reference flows in [Product Blueprint](../product-blueprint/) module docs. No mockups required — reference Design System patterns.*

---

## 12. UI Requirements

| Requirement | Detail |
|-------------|--------|
| **Design System** | New UI uses `@/components/design-system` (`Ds*` components) |
| **Tokens** | Colors, spacing, typography from `@/lib/design-system` |
| **Layout** | Page shell, cards, rails per existing patterns |
| **Responsive breakpoints** | 320px minimum; standard Jimvio breakpoints |
| **Dark mode** | If applicable — token-based, not hardcoded |
| **Icons** | Lucide; consistent sizing |
| **Typography hierarchy** | Heading levels per DS |
| **Legacy UI** | Existing `components/ui/*` preserved unless focused migration |

*Never introduce a third button/card/input implementation.*

---

## 13. Accessibility Requirements

| Requirement | Standard | Detail |
|-------------|----------|--------|
| Keyboard navigation | WCAG 2.2 | All interactive elements reachable and operable |
| Focus visibility | WCAG 2.2 | `ds-focus-ring`; logical tab order |
| Screen readers | WCAG 2.2 | Labels, `aria-*`, live regions for dynamic updates |
| Color contrast | WCAG AA | 4.5:1 text; 3:1 large text and UI components |
| Color as indicator | WCAG 2.2 | Never sole indicator of state |
| Motion | WCAG 2.2 | `prefers-reduced-motion` respected |
| Touch targets | Mobile | Minimum 44×44px |
| Form errors | WCAG 2.2 | Associated with fields; announced |

---

## 14. Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP impact | No regression > 100ms on affected pages | Vercel Speed Insights |
| INP | < 200ms for primary interactions | Vercel Speed Insights |
| CLS | < 0.1 | Vercel Speed Insights |
| API latency (p95) | | Server logs |
| Bundle impact | Lazy load if > 20KB added to client bundle | Build analysis |
| Realtime | If applicable — connection and reconnect behavior | |
| Image loading | Next.js `Image`, Cloudinary transforms, lazy below fold | |

---

## 15. Security Requirements

| Requirement | Detail |
|-------------|--------|
| Authentication | Session required? Guest allowed? |
| Authorization | Role checks; RLS; API guards |
| Input validation | Server-side (zod); never trust client |
| Rate limiting | Per-user / per-IP limits |
| PII handling | What is collected, stored, displayed |
| Audit trail | What actions are logged |
| Protected domain | Tier 1? Mandatory security review |

*Protected domains (auth, payments, checkout, orders): mandatory Security sign-off.*

---

## 16. Privacy Considerations

| Consideration | Detail |
|---------------|--------|
| Data collected | What PII or behavioral data |
| Data stored | Tables, retention period |
| Data shared | Third parties (LLM, email, analytics) |
| User consent | Opt-in required? |
| Right to deletion | GDPR / local compliance |
| AI data handling | No PII to LLM; see [FS-001](../feature-specs/FS-001-jimvio-ai-production-integration.md) |
| Minimization | Collect only what is necessary |

---

## 17. AI Opportunities

| Opportunity | Phase (now / v1.1 / v2) | User approves action? | Domain |
|-------------|-------------------------|----------------------|--------|
| Copilot context | | N/A (read-only) | AI |
| AI search enhancement | | N/A | AI |
| Recommendations | | N/A | AI |
| Automation | | YES — mandatory | AI |

**Rules:**
- AI assists; never auto-executes payments, payouts, refunds, or destructive actions
- Feature must work fully when AI is unavailable
- Expose context for Copilot without coupling business logic to LLM provider

---

## 18. Analytics Events

| Event name | Trigger | Properties | Domain |
|------------|---------|------------|--------|
| `feature.action` | User completes primary action | `userId`, `entityId`, … | |
| | | | |

*Align with [Domain Architecture](../domain-architecture/) event catalog. No PII in event properties.*

---

## 19. KPIs

| KPI | Baseline | Target | Timeframe | Owner |
|-----|----------|--------|-----------|-------|
| | Current value or "unknown" | Measurable target | 30 / 60 / 90 days | PM |

*Link to goals (§4). North Star alignment: creator/seller earnings enabled per active user where applicable.*

---

## 20. Permissions

| Action | Guest | Buyer | Seller | Creator | Affiliate | Comm. Owner | Admin |
|--------|:-----:|:-----:|:------:|:-------:|:---------:|:-----------:|:-----:|
| View | | | | | | | |
| Create | | | | | | | |
| Edit (own) | | | | | | | |
| Edit (any) | | | | | | | |
| Delete | | | | | | | |

*Must match [user roles](../product-blueprint/01-user-roles.md). Server-side enforcement required.*

---

## 21. Notifications

| Trigger event | Channel | Recipient | Message intent | Priority |
|---------------|---------|-----------|----------------|----------|
| | in-app / email / toast / push (future) / none | | | high / normal / low |

*All notifications via `notify-user.ts` facade — source domain does not insert into `notifications` directly.*

---

## 22. Error Handling

| Error condition | User-facing message | Recovery action | Log level |
|-----------------|---------------------|-----------------|-----------|
| Network failure | Friendly, non-technical | Retry button | warn |
| Validation error | Field-specific | Inline correction | info |
| Authorization denied | Clear, actionable | Sign in / upgrade | info |
| Server error | Generic safe message | Retry / support link | error |

**Rules:**
- Never expose stack traces, SQL, internal codes, or gateway raw errors
- Every error state has a recovery path or support escalation

---

## 23. Loading States

| Surface / action | Loading UI | Duration expectation |
|------------------|------------|----------------------|
| Page load | `DsSkeleton` layout | < 2s |
| Form submit | `DsLoader` on button | < 5s |
| List fetch | Skeleton rows | < 3s |
| Background sync | Subtle indicator or none | |

*No blank screens during async operations.*

---

## 24. Empty States

| Surface | Condition | Message | Primary CTA | Component |
|---------|-----------|---------|-------------|-----------|
| List | No items yet | Encouraging, actionable | Create / discover | `DsEmptyState` |
| Search | No results | Suggest alternatives | Clear filters | `DsEmptyState` |
| Filtered | No matches | Explain filter impact | Reset filters | `DsEmptyState` |

---

## 25. Success States

| User action | Success feedback | Next action surfaced |
|-------------|------------------|----------------------|
| Create | Toast + optional navigation | View created item |
| Update | Inline confirmation or toast | Continue editing |
| Delete | Toast confirmation | Undo if applicable |
| Purchase | Order confirmation page + email | Track order |

*Use `dsToast` for transient feedback; persistent confirmation for high-stakes actions.*

---

## 26. Edge Cases

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| EC-1 | User loses connection mid-action | |
| EC-2 | Concurrent edit by two users | |
| EC-3 | Session expires during flow | |
| EC-4 | Rate limit exceeded | |
| EC-5 | Feature flag disabled mid-session | |
| EC-6 | Partial data / migration state | |
| EC-7 | Maximum limits reached (items, size, count) | |

---

## 27. Dependencies

### Domain dependencies

| Domain | Relationship | Integration pattern |
|--------|--------------|---------------------|
| | reads / writes / events | API / event / facade |

*Assign primary owner per [Domain Architecture](../domain-architecture/).*

### System dependencies

| System | Dependency type | Risk if unavailable |
|--------|-----------------|---------------------|
| Supabase | Database / Auth | |
| Payment gateway | External | |
| Cloudinary | Media | |
| Resend | Email | |
| LLM provider | AI (if applicable) | Graceful degradation |

### Team dependencies

| Team | Need |
|------|------|
| Engineering | |
| Design | |
| Security | |
| QA | |
| Operations | |

*Detailed API/DB dependencies documented in paired FS-NNN §22–23.*

---

## 28. Risks

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner |
|------|-------------------|----------------|------------|-------|
| Scope creep | | | Non-goals (§5) | PM |
| Regression in protected domain | | | Tier 1 lifecycle | Eng |
| Performance degradation | | | §14 targets | Eng |
| Security vulnerability | | | §15 review | Security |
| Low adoption | | | §19 KPIs, rollout plan | PM |
| Third-party outage | | | Graceful degradation | Eng |

---

## 29. Rollout Plan

| Phase | Audience | Duration | Success criteria | Feature flag |
|-------|----------|----------|------------------|--------------|
| 1 — Internal | Team (5–15) | 1–2 weeks | No P0 bugs | `feature_x_internal` |
| 2 — Beta | Invited users | 2–4 weeks | KPI baseline established | `feature_x_beta` |
| 3 — Limited | 5% → 25% | 1–2 weeks | Error rate < threshold | Percentage rollout |
| 4 — GA | All users | — | KPI targets on track | Flag removed |

*Align with [Operating Model Part 5](../operating-model/JIMVIO-PRODUCT-OPERATING-MODEL-v1.0.md) release phases.*

---

## 30. Rollback Plan

| Trigger | Detection | Rollback action | Data impact |
|---------|-----------|-----------------|-------------|
| Error rate > X% | Monitoring alert | Disable feature flag | None |
| Payment regression | Webhook failures | Revert deploy + flag off | Reconcile transactions |
| Security incident | Security team | Immediate disable | Audit log review |

**Rules:**
- Rollback must not corrupt data
- Rollback owner identified before launch
- Rollback tested in staging before GA

---

## 31. Acceptance Criteria

*Given / When / Then format. Testable. One AC per P0 user story minimum.*

| ID | Story | Criteria |
|----|-------|----------|
| AC-1 | US-1 | **Given** … **When** … **Then** … |
| AC-2 | US-2 | **Given** … **When** … **Then** … |
| AC-3 | | |

*QA validates every AC before ship. P0 AC failure = launch blocker.*

---

## 32. QA Checklist

*Pre-ship verification. Extends acceptance criteria with cross-cutting checks.*

### Functional

- [ ] All P0 user stories verified
- [ ] All P0 acceptance criteria pass
- [ ] P1 stories verified or explicitly deferred with approval
- [ ] Edge cases (§26) verified

### States

- [ ] Loading states (§23) display correctly
- [ ] Empty states (§24) display correctly
- [ ] Error states (§22) display correctly with recovery
- [ ] Success states (§25) display correctly

### Cross-cutting

- [ ] Permissions matrix (§20) enforced server-side
- [ ] Notifications (§21) fire correctly
- [ ] Analytics events (§18) fire with correct properties
- [ ] Responsive: 320px, tablet, desktop
- [ ] Keyboard navigation complete
- [ ] Screen reader spot check
- [ ] No regression in adjacent features
- [ ] `tsc` passes
- [ ] Feature flag toggle verified

### Tier 1–2 additional

- [ ] Security review complete (§15–16)
- [ ] Performance targets met (§14)
- [ ] Rollback tested in staging (§30)

---

## 33. Future Enhancements

| Enhancement | Target phase | Depends on |
|-------------|--------------|------------|
| | v1.1 / v2.0 / 36-month | |

*Intentional post-v1 scope. Not committed. Requires new PRD or amendment when prioritized.*

---

## Open Questions

| # | Question | Owner | Due | Resolution |
|---|----------|-------|-----|------------|
| 1 | | | | |

*All open questions must be resolved or assigned before **Approved** status.*

---

## Approval

| Role | Name | Date | Approved |
|------|------|------|----------|
| Product (PM/CPO) | | | ☐ |
| Design | | | ☐ |
| Engineering | | | ☐ |
| Security | | | ☐ |
| QA | | | ☐ |
| Leadership (Tier 1) | | | ☐ |

**Status:** Draft → In Review → **Approved** → Implemented

*No implementation until Product + Design + Engineering + QA approve. Security mandatory for Tier 1–2. Leadership mandatory for Tier 1.*
