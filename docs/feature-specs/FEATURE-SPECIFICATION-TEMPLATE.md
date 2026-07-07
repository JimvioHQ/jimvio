# Feature Specification Template

**Copy this file to `FS-NNN-feature-name.md` and complete every section.**

---

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FS-NNN |
| **Title** | |
| **Status** | Draft \| In Review \| Approved \| Implemented \| Deprecated |
| **Author** | |
| **Reviewers** | Product · Engineering · Design · Security · QA |
| **Target release** | |
| **Related modules** | |
| **Related ADRs** | |
| **Product Blueprint ref** | |

---

## 1. Overview

*One paragraph: what is being built and where it lives in Jimvio.*

---

## 2. Problem Statement

*What user or business problem exists today? Include evidence (metrics, feedback, gaps).*

---

## 3. Goals

*Measurable outcomes. Use verbs: increase, reduce, enable, unify.*

| # | Goal | Metric |
|---|------|--------|
| G1 | | |
| G2 | | |

---

## 4. Non-Goals

*Explicitly out of scope. Prevents scope creep.*

- 
- 

---

## 5. User Personas

| Persona | Role(s) | Need |
|---------|---------|------|
| | | |

*Reference [user roles](../product-blueprint/01-user-roles.md).*

---

## 6. Business Value

| Stakeholder | Value |
|-------------|-------|
| Users | |
| Jimvio (revenue/retention) | |
| Operations | |

---

## 7. Functional Requirements

| ID | Requirement | Priority (P0/P1/P2) |
|----|-------------|---------------------|
| FR-1 | | |
| FR-2 | | |

*Must be testable. Use SHALL/MUST language.*

---

## 8. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Performance | |
| NFR-2 | Scalability | |
| NFR-3 | Reliability | |
| NFR-4 | Maintainability | |
| NFR-5 | Compatibility | |

---

## 9. User Stories

```
As a [persona],
I want [capability],
So that [benefit].
```

| ID | Story | Priority |
|----|-------|----------|
| US-1 | | |
| US-2 | | |

---

## 10. Acceptance Criteria

*Given / When / Then format. One AC per user story minimum.*

| ID | Criteria |
|----|----------|
| AC-1 | **Given** … **When** … **Then** … |
| AC-2 | |

---

## 11. UX Requirements

| Requirement | Detail |
|-------------|--------|
| Entry point | Where user opens feature |
| Primary action | One clear CTA |
| Progressive disclosure | Advanced options hidden until needed |
| Mobile | Mobile-first layout |
| Design System | `Ds*` components and tokens only for new UI |
| Motion | 150–220ms, GPU, reduced-motion |
| No dead ends | Next meaningful action always visible |

*No mockups required in spec — reference DS patterns.*

---

## 12. Accessibility Requirements

| Requirement | WCAG / standard |
|-------------|-----------------|
| Keyboard | All interactive elements reachable |
| Focus | Visible focus ring (`ds-focus-ring`) |
| Screen readers | Labels, live regions where needed |
| Color | Not sole indicator of state |
| Motion | `prefers-reduced-motion` respected |

---

## 13. Security Requirements

| Requirement | Detail |
|-------------|--------|
| Authentication | |
| Authorization | Role / RLS / API guard |
| Input validation | zod server-side |
| PII handling | |
| Rate limiting | |
| Audit | |

*Protected domains (payments, auth, checkout): mandatory security review.*

---

## 14. Performance Requirements

| Metric | Target |
|--------|--------|
| LCP impact | No regression > 100ms |
| API latency (p95) | |
| Bundle impact | Lazy load if > 20KB |
| Realtime | |

---

## 15. Analytics Events

| Event name | Trigger | Properties |
|------------|---------|------------|
| | | |

*Align with module KPIs in Product Blueprint.*

---

## 16. Permissions

| Action | Guest | Buyer | Seller | Creator | Affiliate | Admin |
|--------|:-----:|:-----:|:------:|:-------:|:---------:|:-----:|
| | | | | | | |

---

## 17. Notifications

| Event | Channel | Recipient | Template |
|-------|---------|-----------|----------|
| | in-app / email / toast / none | | |

---

## 18. Error Handling

| Error | User message | Recovery |
|-------|--------------|----------|
| | Friendly, non-technical | Retry / support / fallback |

*Never expose stack traces, SQL, or internal codes.*

---

## 19. Loading States

| Surface | Loading UI |
|---------|------------|
| | `DsSkeleton` / `DsLoader` / inline spinner |

---

## 20. Empty States

| Surface | Empty message | CTA |
|---------|-----------------|-----|
| | | `DsEmptyState` |

---

## 21. Success States

| Action | Success feedback |
|--------|------------------|
| | toast / inline confirmation / navigation |

---

## 22. API Dependencies

| Endpoint / Action | Method | Change type (new/modify/none) |
|-------------------|--------|-------------------------------|
| | | |

*Reference [API standards](../technical-architecture/JIMVIO-TECHNICAL-ARCHITECTURE-BLUEPRINT-v1.0.md#part-5--api-standards).*

---

## 23. Database Dependencies

| Table / RPC | Change type | Migration required |
|-------------|-------------|-------------------|
| | read / write / new | yes / no |

*Schema changes require explicit approval + ADR.*

---

## 24. AI Opportunities

| Opportunity | Phase | User approves action? |
|-------------|-------|----------------------|
| | now / future | yes / N/A |

*AI assists; never auto-executes payments, payouts, or destructive actions.*

---

## 25. Future Enhancements

| Enhancement | Phase |
|-------------|-------|
| | v1.1 / v2.0 |

---

## 26. Rollout Strategy

| Phase | Audience | Flags |
|-------|----------|-------|
| 1 | Internal / beta | |
| 2 | % rollout | |
| 3 | GA | |

---

## 27. Rollback Strategy

| Trigger | Action |
|---------|--------|
| | Feature flag off / revert deploy / disable route |

*Must not corrupt data on rollback.*

---

## 28. Testing Strategy

| Layer | Coverage |
|-------|----------|
| Unit | |
| Integration | |
| E2E | |
| Manual QA | Acceptance criteria checklist |
| Security | |
| Performance | |
| Accessibility | Keyboard + screen reader spot check |

---

## 29. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| | L/M/H | L/M/H | |

---

## 30. Open Questions

| # | Question | Owner | Due | Resolution |
|---|----------|-------|-----|------------|
| 1 | | | | |

---

## Approval

| Role | Name | Date | Approved |
|------|------|------|----------|
| Product | | | ☐ |
| Engineering | | | ☐ |
| Design | | | ☐ |
| Security | | | ☐ |
| QA | | | ☐ |
