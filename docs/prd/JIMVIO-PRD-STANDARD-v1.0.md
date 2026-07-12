# Jimvio PRD Standard v1.0

**Official Product Requirements Document governance · July 2026**

> Every major feature must have a PRD before implementation begins.  
> Every approved PRD should be **implementation-ready** — eliminating ambiguity between Product, Design, Engineering, QA, AI, and Leadership.

**Template:** [PRD-TEMPLATE.md](./PRD-TEMPLATE.md) · **Index:** [README.md](./README.md)

---

## Table of contents

1. [Mission](#mission)
2. [What is a PRD?](#what-is-a-prd)
3. [PRD vs Feature Spec vs TSL](#prd-vs-feature-spec-vs-tsl)
4. [When a PRD is required](#when-a-prd-is-required)
5. [The 33 sections](#the-33-sections)
6. [Quality requirements](#quality-requirements)
7. [Review and approval](#review-and-approval)
8. [Tier requirements](#tier-requirements)
9. [Writing guidance](#writing-guidance)
10. [PRD lifecycle](#prd-lifecycle)

---

## Mission

Create world-class product requirements that:

- Eliminate ambiguity across disciplines
- Define measurable success before code is written
- Capture every production state (loading, error, empty, success)
- Plan rollout and rollback before launch
- Enable QA to test against explicit acceptance criteria

---

## What is a PRD?

A **Product Requirements Document (PRD)** is the authoritative product intake for a major feature. It answers:

- **Why** are we building this? (Problem, goals, business value)
- **Who** is it for? (Personas, permissions)
- **What** must it do? (Functional and non-functional requirements)
- **How** should it feel? (UX, UI, accessibility)
- **How** do we know it works? (Acceptance criteria, QA checklist, KPIs)
- **How** do we ship and recover? (Rollout, rollback, risks)

A PRD is **not** implementation code, API schemas, or database migrations — those belong in [FS](../feature-specs/) and [TSL](../technical-spec-library/).

---

## PRD vs Feature Spec vs TSL

| Aspect | PRD (`PRD-NNN`) | Feature Spec (`FS-NNN`) | Technical Spec (`TSL-NNN`) |
|--------|-----------------|-------------------------|----------------------------|
| **Primary author** | Product Manager | Product + Engineering | Engineering |
| **Primary audience** | Leadership, Design, QA | Engineering, Security, QA | Engineering |
| **Focus** | Product intent, UX, business | Feature behavior + API/DB deps | Implementation contract |
| **Sections** | 33 | 30 | 11 |
| **Executive summary** | Yes | Overview only | No |
| **Background / context** | Yes | Problem only | No |
| **Separate UX/UI/A11y/Perf/Security** | Yes (§11–15) | Combined NFRs | Security appendix |
| **API/DB dependencies** | High-level (§27) | Detailed (§22–23) | Full contract |
| **Testing strategy** | QA checklist (§32) | Full test strategy (§28) | Verification plan |
| **When** | Before FS | Before implementation | Tier 1–2 before code |

**Workflow:** Approved PRD → Draft FS (engineering translates dependencies) → Draft TSL (Tier 1–2) → Implementation.

**ID pairing:** PRD-003 may pair with FS-005 — cross-reference in metadata; IDs are independent sequences.

---

## When a PRD is required

| Scenario | PRD | FS | TSL |
|----------|:---:|:--:|:---:|
| New user-facing capability (Tier 1–3) | ✅ | ✅ | Tier 1–2 ✅ |
| Auth, payments, checkout, orders change | ✅ | ✅ | ✅ |
| New platform module | ✅ | ✅ | ✅ |
| AI in production user flow | ✅ | ✅ | ✅ |
| Cross-domain feature | ✅ | ✅ | Per tier |
| Tier 4 polish / analytics | Optional | ✅ | — |
| Tier 5 experiment | Lightweight PRD or RFC | Lightweight FS | — |
| Bug fix (obvious scope) | — | — | — |
| Copy / content only | — | — | — |

---

## The 33 sections

| # | Section | Purpose |
|---|---------|---------|
| 1 | Executive Summary | One-page leadership brief |
| 2 | Problem Statement | What is broken or missing |
| 3 | Background | Context, history, prior attempts |
| 4 | Goals | Measurable outcomes |
| 5 | Non-Goals | Explicit scope boundaries |
| 6 | Business Value | Stakeholder value proposition |
| 7 | User Personas | Who benefits |
| 8 | User Stories | Capability narratives |
| 9 | Functional Requirements | What the system must do |
| 10 | Non-Functional Requirements | Cross-cutting quality attributes |
| 11 | UX Requirements | Flow, interaction, platform fit |
| 12 | UI Requirements | Visual, DS compliance |
| 13 | Accessibility Requirements | WCAG, keyboard, SR |
| 14 | Performance Requirements | CWV, latency, bundle |
| 15 | Security Requirements | Auth, authorization, validation |
| 16 | Privacy Considerations | PII, consent, data retention |
| 17 | AI Opportunities | Assistive AI, future automation |
| 18 | Analytics Events | Instrumentation contract |
| 19 | KPIs | Success metrics |
| 20 | Permissions | Role matrix |
| 21 | Notifications | Channels and triggers |
| 22 | Error Handling | Failure UX |
| 23 | Loading States | Async feedback |
| 24 | Empty States | Zero-data UX |
| 25 | Success States | Confirmation feedback |
| 26 | Edge Cases | Boundary conditions |
| 27 | Dependencies | Domains, systems, teams |
| 28 | Risks | Likelihood, impact, mitigation |
| 29 | Rollout Plan | Phased release |
| 30 | Rollback Plan | Recovery strategy |
| 31 | Acceptance Criteria | Testable Given/When/Then |
| 32 | QA Checklist | Pre-ship verification |
| 33 | Future Enhancements | Post-v1 roadmap |

*Full field-level guidance: [PRD-TEMPLATE.md](./PRD-TEMPLATE.md)*

---

## Quality requirements

Every PRD must be:

| Quality | Definition | Verification |
|---------|------------|--------------|
| **Complete** | All 33 sections filled or N/A with reason | Review checklist |
| **Unambiguous** | One interpretation per requirement | Eng + QA review |
| **Testable** | AC in Given/When/Then; FR use SHALL/MUST | QA sign-off |
| **Measurable** | KPIs have baselines and targets | Product sign-off |
| **Production-ready** | All UI states defined (§22–25) | Design sign-off |
| **Maintainable** | Linked to domain, module, ADRs | Architect review |
| **Scalable** | Performance and rollout considered | Eng sign-off |

### Language standards

| Use | Avoid |
|-----|-------|
| SHALL / MUST for requirements | "Should probably", "maybe", "TBD" without owner |
| Given / When / Then for AC | Vague "works correctly" |
| Specific metrics (%, ms, count) | "Fast", "good UX", "user-friendly" |
| Named roles from [user roles](../product-blueprint/01-user-roles.md) | Generic "user" when role matters |
| `Ds*` component names for new UI | One-off component names |

---

## Review and approval

### Review sequence

1. **Author** completes draft PRD
2. **Product** validates goals, non-goals, business value, KPIs
3. **Design** validates UX, UI, accessibility (§11–13)
4. **Engineering** validates dependencies, NFRs, risks, feasibility
5. **Security** validates §15–16 (mandatory for Tier 1–2)
6. **QA** validates AC and QA checklist (§31–32)
7. **Leadership** approves Tier 1 (Founder/CPO)

### Approval block

Every PRD ends with a sign-off table (in template). **No implementation** until Product + Design + Engineering + QA approve. Security mandatory for protected domains.

---

## Tier requirements

| Tier | Examples | PRD depth | Leadership |
|------|----------|-----------|------------|
| **T1** | Auth, payments, checkout, orders | Full 33 sections | Founder sign-off |
| **T2** | Products, wallet, admin ops | Full 33 sections | CPO sign-off |
| **T3** | Copilot, UGC, communities | Full 33 sections | PM sign-off |
| **T4** | Analytics, UI polish | Core sections; N/A acceptable for §17 | PM sign-off |
| **T5** | Experiments | Lightweight (§1–6, 29–31 minimum) | PM sign-off |

*Full tier definitions: [Operating Model Part 3](../operating-model/JIMVIO-PRODUCT-OPERATING-MODEL-v1.0.md)*

---

## Writing guidance

### Executive Summary (§1)

Write this **last**. One page maximum. Include: problem, solution, business impact, target release, tier, domain owner.

### Problem vs Background (§2–3)

- **Problem** = what hurts today (user pain, metric gap)
- **Background** = why now (market, prior work, strategic fit)

### Goals vs KPIs (§4 vs §19)

- **Goals** = outcomes we pursue (qualitative + directional)
- **KPIs** = how we measure success (baseline → target → timeframe)

### States (§22–25)

Every user-facing surface needs all four states documented. Use [Design System](../design-system/) patterns:

| State | Component |
|-------|-----------|
| Loading | `DsSkeleton`, `DsLoader` |
| Empty | `DsEmptyState` |
| Error | Inline alert + retry |
| Success | `dsToast`, inline confirmation |

### Domain assignment (§27)

Every PRD must name its [Domain Architecture](../domain-architecture/) owner. Cross-domain features list all domains and integration pattern (event, API, facade).

---

## PRD lifecycle

```
Draft → In Review → Approved → Implementation (FS/TSL) → Shipped → Archived
                              ↘ Deprecated (if superseded)
```

| Status | Meaning |
|--------|---------|
| **Draft** | Author writing; not ready for review |
| **In Review** | Circulated to reviewers |
| **Approved** | All sign-offs complete; FS may begin |
| **Implemented** | Feature shipped; PRD is historical record |
| **Deprecated** | Superseded by newer PRD |

**Maintenance:** When scope changes during implementation, update PRD first (or concurrently with FS). PRD is the product source of truth; FS is the engineering source of truth.

---

## Related documents

| Document | Role |
|----------|------|
| [Product Bible](../product-bible/) | Strategic alignment |
| [Product Blueprint](../product-blueprint/) | Module context |
| [Business Capability Model](../business-capability-model/) | Capability mapping (L1.L2) |
| [Domain Architecture](../domain-architecture/) | Domain ownership |
| [Platform Standards](../platform-standards/) | Implementation quality |
| [Operating Model](../operating-model/) | Process and tiers |
| [Feature Specs](../feature-specs/) | Engineering intake |
| [ADRs](../adr/) | Architectural decisions |

---

**Jimvio PRD Standard v1.0** — *Complete. Unambiguous. Implementation-ready.*

*End of document*
